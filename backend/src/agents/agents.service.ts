import { Injectable, Logger } from '@nestjs/common';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { z } from 'zod';
import { ExplanationRequestDto, ExplanationResponseDto } from './dto/explanation.dto';
import { NutritionAdviceRequestDto, NutritionAdviceResponseDto } from './dto/nutrition-advice.dto';
import { reviewInstructionSchema, ReviewInstruction } from './schemas/review-instruction.schema';

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

  async reviewAction(payload: { text?: string; currentPlanSnippet?: unknown }): Promise<ReviewInstruction> {
    const prompt: { role: 'system' | 'user'; content: string }[] = [
      {
        role: 'system',
        content:
          'You are Review Agent. Map the user action + context to structured JSON ReviewInstruction. Return ONLY JSON.',
      },
      {
        role: 'user',
        content: JSON.stringify({
          text: payload.text,
          currentPlanSnippet: payload.currentPlanSnippet,
        }),
      },
    ];
    const raw = await this.callModel(this.reviewModel, prompt, 'review');
    this.logger.log(`reviewAction called model=${this.reviewModel}`);
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
    this.logger.log(`coachPlan called model=${this.coachModel}`);
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
    const res = await chat.invoke(lcMessages);
    const content = typeof res.content === 'string' ? res.content : JSON.stringify(res.content);
    if (!content) throw new Error('LLM returned empty content');
    try {
      return JSON.parse(content);
    } catch (e) {
      throw new Error('Failed to parse LLM JSON');
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
}
