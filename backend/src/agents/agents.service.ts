import { Injectable, Logger } from '@nestjs/common';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { z } from 'zod';
import { ExplanationRequestDto, ExplanationResponseDto } from './dto/explanation.dto';
import { NutritionAdviceRequestDto, NutritionAdviceResponseDto } from './dto/nutrition-advice.dto';
import { reviewInstructionSchema, ReviewInstruction } from './schemas/review-instruction.schema';
import { ChooseIngredientDto } from './dto/choose-ingredient.dto';

const PlanMealSchema = z.object({
  meal_slot: z.string(),
  recipe_id: z.string(),
  portion_multiplier: z.number().optional(),
});

const PlanDaySchema = z.object({
  day_index: z.number(),
  meals: z.array(PlanMealSchema),
});

const WeeklyPlanSchema = z.object({
  week_start_date: z.string(),
  days: z.array(PlanDaySchema),
});

@Injectable()
export class AgentsService {
  private readonly logger = new Logger(AgentsService.name);
  private provider = (process.env.LLM_PROVIDER || process.env.LLM_MODE || 'local').toLowerCase();
  private reviewModel = process.env.LLM_MODEL_REVIEW || process.env.OPENAI_MODEL_REVIEW || 'llama3';
  private coachModel = process.env.LLM_MODEL_COACH || process.env.OPENAI_MODEL_COACH || 'llama3';
  private explainModel =
    process.env.LLM_MODEL_EXPLAIN || process.env.OPENAI_MODEL_EXPLAIN || this.coachModel;
  private nutritionModel =
    process.env.LLM_MODEL_NUTRITION || process.env.OPENAI_MODEL_NUTRITION || this.coachModel;
  private llmBaseUrl = process.env.LLM_BASE_URL || '';
  private llmApiKey = process.env.LLM_API_KEY || process.env.OPENAI_API_KEY || '';
  private logAgent(kind: string, message: string) {
    this.logger.log(`[${kind}] ${message}`);
  }

  async reviewAction(payload: {
    userId?: string;
    weeklyPlanId?: string;
    actionContext?: any;
    reasonText?: string;
    text?: string;
    profileSnippet?: any;
    currentPlanSummary?: unknown;
    currentPlanSnippet?: unknown; // legacy shape
  }): Promise<ReviewInstruction> {
    const prompt: { role: 'system' | 'user'; content: string }[] = [
      {
        role: 'system',
        content:
          'You are Review Agent. Map the user action + context to structured JSON ReviewInstruction. Return ONLY JSON.',
      },
      {
        role: 'user',
        content: JSON.stringify({
          userId: payload.userId,
          weeklyPlanId: payload.weeklyPlanId,
          actionContext: payload.actionContext,
          reasonText: payload.reasonText || payload.text,
          profileSnippet: payload.profileSnippet,
          currentPlanSummary: payload.currentPlanSummary || payload.currentPlanSnippet,
        }),
      },
    ];
    const raw = await this.callModel(this.reviewModel, prompt, 'review');
    this.logAgent('review', `model=${this.reviewModel}`);
    return reviewInstructionSchema.parse(raw);
  }

  async coachPlan(payload: {
    profile: any;
    candidates: any;
    week_start_date?: string;
  }) {
    const prompt: { role: 'system' | 'user'; content: string }[] = [
      {
        role: 'system',
        content:
          'You are Coach Agent. Choose recipes from provided candidates for each day/meal. Output JSON {week_start_date, days:[{day_index, meals:[{meal_slot, recipe_id, portion_multiplier}]}]}. Use only provided recipe_id values.',
      },
      {
        role: 'user',
        content: JSON.stringify({
          profile: payload.profile,
          candidates: payload.candidates,
          week_start_date: payload.week_start_date || new Date().toISOString().slice(0, 10),
        }),
      },
    ];
    const raw = await this.callModel(this.coachModel, prompt, 'coach');
    this.logAgent('coach', `model=${this.coachModel}`);
    return WeeklyPlanSchema.parse(raw);
  }

  private async callModel(
    model: string,
    messages: { role: 'system' | 'user'; content: string }[],
    kind: 'review' | 'coach' | 'explain' | 'nutrition',
  ): Promise<any> {
    const client = this.createClient(kind);
    const chat = new ChatOpenAI({
      model,
      maxTokens: 800,
      apiKey: client.apiKey,
      configuration: {
        baseURL: client.baseUrl,
      },
      modelKwargs: {
        response_format: { type: 'json_object' },
      },
    });

    const lcMessages = messages.map((m) =>
      m.role === 'system' ? new SystemMessage(m.content) : new HumanMessage(m.content),
    );
    const start = Date.now();
    try {
      const res = await chat.invoke(lcMessages);
      const content = typeof res.content === 'string' ? res.content : JSON.stringify(res.content);
      if (!content) {
        this.logAgent(kind, `empty response model=${model}`);
        throw new Error('LLM returned empty content');
      }
      const parsed = JSON.parse(content);
      this.logAgent(kind, `success model=${model} provider=${this.provider} latency_ms=${Date.now() - start}`);
      return parsed;
    } catch (err) {
      this.logger.error(
        `[${kind}] model=${model} provider=${this.provider} failed: ${(err as Error).message}`,
      );
      throw err;
    }
  }

  private createClient(kind: 'review' | 'coach' | 'explain' | 'nutrition') {
    const provider = this.provider === 'openai' ? 'openai' : 'local';
    const apiKey = provider === 'openai' ? process.env.OPENAI_API_KEY || this.llmApiKey : this.llmApiKey;
    const baseUrl =
      provider === 'openai'
        ? process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'
        : this.llmBaseUrl;
    if (!baseUrl) {
      throw new Error('LLM_BASE_URL must be configured for local provider');
    }
    const model =
      kind === 'review'
        ? this.reviewModel
        : kind === 'coach'
          ? this.coachModel
          : kind === 'explain'
            ? this.explainModel
            : this.nutritionModel;
    return { baseUrl, apiKey, model };
  }

  async explain(request: ExplanationRequestDto): Promise<ExplanationResponseDto> {
    const prompt: { role: 'system' | 'user'; content: string }[] = [
      {
        role: 'system',
        content:
          'You are Explanation Agent. Given a question and context (plan/profile/reasons), reply ONLY with JSON {explanation: string, evidence: string[]}. Be concise, no prose.',
      },
      {
        role: 'user',
        content: JSON.stringify(request),
      },
    ];
    const raw = await this.callModel(this.explainModel, prompt, 'explain');
    const schema = z.object({
      explanation: z.string(),
      evidence: z.array(z.string()).default([]),
    });
    const parsed = schema.parse(raw);
    return parsed;
  }

  async nutritionAdvice(request: NutritionAdviceRequestDto): Promise<NutritionAdviceResponseDto> {
    const prompt: { role: 'system' | 'user'; content: string }[] = [
      {
        role: 'system',
        content:
          'You are Nutrition Advisor. Provide 3-6 concise suggestions in JSON {advice:[{title, detail, category?}]}. Focus on diet improvements, hydration, or timing. No prose.',
      },
      { role: 'user', content: JSON.stringify(request) },
    ];
    const raw = await this.callModel(this.nutritionModel, prompt, 'nutrition');
    const schema = z.object({
      advice: z.array(
        z.object({
          title: z.string(),
          detail: z.string(),
          category: z.string().optional(),
        }),
      ),
    });
    return schema.parse(raw);
  }

  async chooseIngredient(payload: ChooseIngredientDto): Promise<{ ingredient_id: string }> {
    const candidateIds = new Set(payload.candidates.map((c) => c.id));
    const prompt: { role: 'system' | 'user'; content: string }[] = [
      {
        role: 'system',
        content:
          'You are Ingredient Selector. Choose the most likely ingredient from the provided candidates. Return ONLY JSON {ingredient_id}. Do not invent new ids.',
      },
      {
        role: 'user',
        content: JSON.stringify({
          reasonText: payload.reasonText,
          candidates: payload.candidates,
        }),
      },
    ];
    const schema = z.object({ ingredient_id: z.string() });
    const raw = await this.callModel(this.reviewModel, prompt, 'review');
    const parsed = schema.parse(raw);
    if (!candidateIds.has(parsed.ingredient_id)) {
      throw new Error('LLM returned ingredient_id not in provided candidates');
    }
    return parsed;
  }

  async chooseRecipe(payload: {
    reasonText?: string;
    candidates: {
      id: string;
      name: string;
      meal_slot?: string;
      meal_type?: string;
      base_cost_gbp?: number | null;
      base_kcal?: number | null;
      base_protein?: number | null;
      base_carbs?: number | null;
      base_fat?: number | null;
    }[];
  }): Promise<{ recipe_id: string }> {
    const candidateIds = new Set(payload.candidates.map((c) => c.id));
    const prompt: { role: 'system' | 'user'; content: string }[] = [
      {
        role: 'system',
        content:
          'You are Recipe Selector. Choose ONE recipe_id from provided candidates. Return ONLY JSON {recipe_id}. Use note/reason if provided. Do not invent ids.',
      },
      {
        role: 'user',
        content: JSON.stringify({
          reasonText: payload.reasonText,
          candidates: payload.candidates,
        }),
      },
    ];
    const schema = z.object({ recipe_id: z.string() });
    const raw = await this.callModel(this.reviewModel, prompt, 'review');
    const parsed = schema.parse(raw);
    if (!candidateIds.has(parsed.recipe_id)) {
      throw new Error('LLM returned recipe_id not in provided candidates');
    }
    return parsed;
  }

  async adjustRecipe(payload: { note: string; current: any }) {
    const schema = z.object({
      new_name: z.string().optional(),
      instructions: z.string().optional(),
      ingredients: z.array(
        z.object({
          ingredient_id: z.string().optional(),
          ingredient_name: z.string().optional(),
          quantity: z.number(),
          unit: z.string(),
        }),
      ),
    });
    const prompt: { role: 'system' | 'user'; content: string }[] = [
      {
        role: 'system',
        content:
          'You are Recipe Adjuster. Given current recipe and user note, respond ONLY with JSON {new_name?, instructions?, ingredients:[{ingredient_id?, ingredient_name?, quantity, unit}]}. Use ingredient_id when provided; do not invent ids.',
      },
      { role: 'user', content: JSON.stringify(payload) },
    ];
    const raw = await this.callModel(this.reviewModel, prompt, 'review');
    return schema.parse(raw);
  }

  async generateRecipe(payload: {
    note?: string;
    meal_slot?: string;
    meal_type?: string;
    difficulty?: string;
    budget_per_meal?: number;
  }) {
    const toNum = (v: any) => {
      if (v === null || v === undefined || v === '') return 0;
      const n = Number(v);
      return Number.isFinite(n) ? n : 0;
    };

    const schema = z.object({
      name: z.string(),
      meal_slot: z.string().optional(),
      meal_type: z.string().optional(),
      difficulty: z.string().optional(),
      base_cost_gbp: z.preprocess(toNum, z.number().optional()),
      instructions: z.union([z.string(), z.array(z.string())]).optional(),
      ingredients: z.array(
        z.object({
          ingredient_name: z.string(),
          quantity: z.preprocess(toNum, z.number()),
          unit: z.string(),
        }),
      ),
    });
    const prompt: { role: 'system' | 'user'; content: string }[] = [
      {
        role: 'system',
        content:
          'You are Recipe Generator. Return ONLY JSON with {name, meal_slot, meal_type?, difficulty?, base_cost_gbp?, instructions, ingredients:[{ingredient_name, quantity, unit}]}. Use concise instructions. Do not invent IDs.',
      },
      { role: 'user', content: JSON.stringify(payload) },
    ];
    const raw = await this.callModel(this.reviewModel, prompt, 'review');
    return schema.parse(raw);
  }
}
