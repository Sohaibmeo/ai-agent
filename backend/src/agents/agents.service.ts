import { Injectable, Logger } from '@nestjs/common';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { z } from 'zod';
import { ExplanationRequestDto, ExplanationResponseDto } from './dto/explanation.dto';
import { NutritionAdviceRequestDto, NutritionAdviceResponseDto } from './dto/nutrition-advice.dto';
import { reviewInstructionSchema, ReviewInstruction } from './schemas/review-instruction.schema';
import { ChooseIngredientDto } from './dto/choose-ingredient.dto';
import { calculateTargets } from '../plans/utils/profile-targets';

const DayMealIngredientSchema = z.object({
  ingredient_name: z.string(),
  quantity: z.preprocess((v) => {
    if (v === '' || v === null || v === undefined) return 0;
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }, z.number()),
  unit: z.string(),
});

const DayMealSchema = z.object({
  meal_slot: z.string(),
  name: z.string(),
  difficulty: z.string().optional(),
  instructions: z.union([z.string(), z.array(z.string())]),
  ingredients: z.array(DayMealIngredientSchema),
  target_kcal: z.number().optional(),
  target_protein: z.number().optional(),
  compliance_notes: z.string().optional(),
});

const PlanDaySchema = z.object({
  day_index: z.number(),
  meals: z.array(DayMealSchema),
});

const WeeklyPlanSchema = z.object({
  week_start_date: z.string(),
  days: z.array(PlanDaySchema),
});

const RecipeStubSchema = z.object({
  name: z.string(),
  meal_slot: z.string(),
  meal_type: z.string().optional(),
  difficulty: z.string().optional(),
  base_cost_gbp: z.number().optional(),
  instructions: z.any().optional(),
  ingredients: z.array(
    z.object({
      ingredient_name: z.string(),
      quantity: z.number(),
      unit: z.string().optional(),
    }),
  ),
});

const DayWithRecipesSchema = z.object({
  day_index: z.number(),
  meals: z.array(
    z.object({
      meal_slot: z.string(),
      recipe: RecipeStubSchema,
    }),
  ),
});

export type LlmDayMeal = z.infer<typeof DayMealSchema>;
export type LlmPlanDay = z.infer<typeof PlanDaySchema>;
type WeeklyPlan = z.infer<typeof WeeklyPlanSchema>;
type DayWithRecipes = z.infer<typeof DayWithRecipesSchema>;

type WeekState = {
  week_start_date: string;
  weekly_budget_gbp?: number;
  used_budget_gbp: number;
  remaining_days: number;
  notes?: string; // can hold diversity / constraint hints for the LLM
};

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

  async generateDayPlanWithCoachLLM(payload: {
    profile: any;
    day_index: number;
    week_state: WeekState;
    targets: {
      daily_kcal: number;
      daily_protein: number;
    };
    meal_slots: string[];
    maxRetries?: number;
  }): Promise<LlmPlanDay> {
    const perMealBudget =
      payload.week_state.weekly_budget_gbp && payload.meal_slots.length
        ? Number(payload.week_state.weekly_budget_gbp) /
          Math.max(1, payload.meal_slots.length * Math.max(1, payload.week_state.remaining_days || 1))
        : undefined;

    if (process.env.DEBUG_LLM === '1') {
      this.logger.log(
        `[coach-debug] day_index=${payload.day_index} goal=${payload.profile?.goal || 'unknown'} diet=${
          payload.profile?.diet_type || 'any'
        } allergies=${Array.isArray(payload.profile?.allergy_keys) ? payload.profile.allergy_keys.length : 0} budget=${
          payload.week_state.weekly_budget_gbp ?? 'n/a'
        } perMealBudget=${perMealBudget ?? 'n/a'} slots=${payload.meal_slots.join(',')} targets_kcal=${
          payload.targets.daily_kcal
        } targets_protein=${payload.targets.daily_protein}`,
      );
    }

    const prompt: { role: 'system' | 'user'; content: string }[] = [
    {
      role: 'system',
      content:
        'You are Day Coach, a diet planning expert.\n' +
        '\n' +
        'CRITICAL FORMAT RULES (READ CAREFULLY):\n' +
        '- Your ENTIRE reply MUST be a single valid JSON object.\n' +
        '- Do NOT wrap the JSON in markdown, backticks, or any other text.\n' +
        '- Do NOT include comments, explanations, or extra keys.\n' +
        '- Do NOT output any chain-of-thought, reasoning text, or <think> blocks. You may reason internally but only output the final JSON.\n' +
        '\n' +
        'PLANNING RULES:\n' +
        '- Plan ALL meals for ONE day for this user.\n' +
        '- You receive: profile, the day index, weekly state, daily macro targets, and a list of meal_slots.\n' +
        '- For each meal_slot, you MUST propose ONE complete recipe: name, difficulty, ingredient list, and instructions.\n' +
        '- Ingredients MUST have: ingredient_name, quantity (number), and unit.\n' +
        '- All ingredient quantities MUST be in grams ("g"). Avoid units like "piece", "cup", etc.\n' +
        '  If you need to use those for thinking, CONVERT them to grams yourself and still return unit="g".\n' +
        '- Respect profile.diet_type and allergy_keys; avoid disallowed ingredients and anything the user should not consume.\n' +
        '- Favor ingredients the user is likely to like; avoid disliked items if provided.\n' +
        '- Honor weekly_budget_gbp and per-meal budget hints; small overruns are OK but stay close.\n' +
        '- Align with user goal (lose/maintain/gain weight) by keeping total day kcal near the daily target and providing good protein coverage.\n' +
        '- If you must deviate from diet/allergy/budget/goal, explain briefly in compliance_notes per meal.\n' +
        '- You may roughly allocate daily_kcal and daily_protein across meals and record that in target_kcal and target_protein per meal.\n' +
        '- Use simple, realistic ingredients available in a typical UK supermarket.\n' +
        '- Avoid very niche or branded ingredients.\n' +
          '- Respond ONLY with JSON of the form:\n' +
          '  { day_index, meals:[{\n' +
          '     meal_slot,\n' +
          '     name,\n' +
          '     difficulty?,\n' +
          '     instructions: string | string[],\n' +
          '     ingredients:[{ingredient_name, quantity, unit}],\n' +
          '     target_kcal?,\n' +
          '     target_protein?,\n' +
          '     compliance_notes?\n' +
          '  }] }\n' +
          '- Do NOT include any IDs or database keys. Do NOT mention recipe_id or candidate recipes. Do NOT return prose.',
    },
    {
      role: 'user',
      content: JSON.stringify({
        profile: payload.profile,
        day_index: payload.day_index,
        week_state: payload.week_state,
        targets: payload.targets,
        meal_slots: payload.meal_slots,
        per_meal_budget_hint_gbp: perMealBudget,
        diet_type: payload.profile?.diet_type,
        allergy_keys: payload.profile?.allergy_keys,
        goal: payload.profile?.goal,
      }),
    },
  ];

    const retries = payload.maxRetries ?? 2;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt += 1) {
      try {
        const raw = await this.callModel(this.coachModel, prompt, 'coach');
        this.logAgent(
          'coach',
          `day_index=${payload.day_index} model=${this.coachModel} attempt=${attempt + 1}`,
        );

        const rawMeals = Array.isArray((raw as any)?.meals) ? (raw as any).meals : [];
        const normalizedMeals = rawMeals
          .filter((m: any) => m && typeof m === 'object' && !Array.isArray(m))
          .map((m: any) => ({
            meal_slot:
              typeof m.meal_slot === 'string'
                ? m.meal_slot.trim().toLowerCase() || 'meal'
                : 'meal',
            name: m.name,
            difficulty:
              typeof m.difficulty === 'string'
                ? m.difficulty
                : m.difficulty !== undefined && m.difficulty !== null
                  ? String(m.difficulty)
                  : 'easy',
            instructions:
              Array.isArray(m.instructions) || typeof m.instructions === 'string'
                ? m.instructions
                : undefined,
            ingredients: Array.isArray(m.ingredients)
              ? m.ingredients
                  .filter((ing: any) => ing && typeof ing === 'object')
                  .map((ing: any) => ({
                    ingredient_name: ing.ingredient_name,
                    quantity: ing.quantity,
                    unit: 'g',
                  }))
              : [],
            target_kcal: m.target_kcal,
            target_protein: m.target_protein,
            compliance_notes: m.compliance_notes,
          }));

        const candidate = {
          day_index: (raw as any)?.day_index ?? payload.day_index,
          meals: normalizedMeals,
        };

        console.log('Candidate:', JSON.stringify(candidate, null, 2));

        const parsed = PlanDaySchema.safeParse(candidate);
        const unitsOk = normalizedMeals.every(
          (meal: any) => (meal.ingredients || []).every((ing: any) => (ing.unit || '').toLowerCase() === 'g'),
        );
        const slotsOk =
          Array.isArray(payload.meal_slots) &&
          payload.meal_slots.every((slot) => normalizedMeals.some((m: any) => m.meal_slot === slot));
        const parsedOk = parsed.success && parsed.data.meals.length > 0;
        if (parsedOk && unitsOk && slotsOk) {
          return parsed.data;
        }

        this.logger.warn(
          `[coach] day_index=${payload.day_index} attempt=${attempt + 1} invalid or empty meals (parsedOk=${parsedOk} unitsOk=${unitsOk} slotsOk=${slotsOk})`,
        );
        if (!parsed.success) {
          lastError = new Error(JSON.stringify(parsed.error.issues));
        }
      } catch (err) {
        lastError = err as Error;
        this.logger.warn(
          `[coach] day_index=${payload.day_index} attempt=${attempt + 1} failed: ${
            (err as Error)?.message
          }`,
        );
      }
    }

    if (lastError) {
      this.logger.error(
        `[coach] day_index=${payload.day_index} exhausted retries err=${lastError.message}`,
      );
    }
    return { day_index: payload.day_index, meals: [] };
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
      name: z.string().optional(),
      meal_slot: z.string().optional(),
      meal_type: z.string().nullable().optional(),
      difficulty: z.string().optional(),
      base_cost_gbp: z.preprocess(toNum, z.number().optional()),
      instructions: z.any().optional(),
      ingredients: z
        .array(
          z.object({
            ingredient_name: z.string(),
            quantity: z.preprocess(toNum, z.number()),
            unit: z.string().nullable().optional(),
          }),
        )
        .optional(),
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
