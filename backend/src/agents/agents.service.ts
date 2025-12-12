import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { z } from 'zod';
import {
  DayMealSchema,
  PlanDaySchema,
  WeeklyPlanSchema,
  LlmDayMeal,
  LlmPlanDay,
} from './schemas/plan-generation.schema';
import { reviewInstructionSchema, ReviewInstruction } from './schemas/review-instruction.schema';
import { PlansService } from '../plans/plans.service';
import { UsersService } from '../users/users.service';
import { ProfileService } from '../profile/profile.service';
import { CREDIT_COSTS } from '../constants/credits';
import { calculateTargets } from '../plans/utils/profile-targets';
import {
  DAY_COACH_SYSTEM_PROMPT,
  EXPLAIN_SYSTEM_PROMPT,
  INGREDIENT_ESTIMATOR_SYSTEM_PROMPT,
  RECIPE_ADJUSTOR_SYSTEM_PROMPT,
  RECIPE_GENERATOR_SYSTEM_PROMPT,
  REVIEW_SYSTEM_PROMPT,
} from './agent-prompts';

type WeekState = {
  week_start_date: string;
  weekly_budget_gbp?: number;
  used_budget_gbp: number;
  remaining_days: number;
  notes?: string; // can hold diversity / constraint hints for the LLM
};

type LlmClient = {
  baseUrl: string;
  apiKey: string;
  model: string;
  provider: 'local' | 'openai';
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
  private visionModel =
    process.env.LLM_MODEL_VISION || process.env.OPENAI_MODEL_VISION || this.coachModel;
  private llmBaseUrl = process.env.LLM_BASE_URL || '';
  private llmApiKey = process.env.LLM_API_KEY || process.env.OPENAI_API_KEY || '';
  private openaiMaxCompletionTokens = Number(process.env.LLM_MAX_COMPLETION_TOKENS_OPENAI) || 8000;
  private localMaxTokens = Number(process.env.LLM_MAX_TOKENS_LOCAL) || 800;
  private logAgent(kind: string, message: string) {
    this.logger.log(`[${kind}] ${message}`);
  }

  constructor(
    @Inject(forwardRef(() => PlansService))
    private readonly plansService: PlansService,
    private readonly usersService: UsersService,
    private readonly profileService: ProfileService,
  ) {}

  private summarizePlanContext = async (userId?: string) => {
    if (!userId) return '';
    try {
      const plan = await this.plansService.getActivePlan(userId);
      if (!plan) return '';
      const total = [
        plan.total_kcal ? `weekly kcal ${Math.round(Number(plan.total_kcal))}` : null,
        plan.total_protein ? `${Math.round(Number(plan.total_protein))}g protein` : null,
        plan.total_carbs ? `${Math.round(Number(plan.total_carbs))}g carbs` : null,
        plan.total_fat ? `${Math.round(Number(plan.total_fat))}g fat` : null,
      ]
        .filter(Boolean)
        .join(', ');
      const dayName = (idx: number) =>
        ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][idx] || `Day ${idx + 1}`;
      const dayLines = (plan.days || [])
        .map((d) => {
          const kcal = d.daily_kcal ? Math.round(Number(d.daily_kcal)) : '—';
          const p = d.daily_protein ? Math.round(Number(d.daily_protein)) : '—';
          const c = d.daily_carbs ? Math.round(Number(d.daily_carbs)) : '—';
          const f = d.daily_fat ? Math.round(Number(d.daily_fat)) : '—';
          return `${dayName(d.day_index)}: ${kcal} kcal, ${p}g protein, ${c}g carbs, ${f}g fat`;
        })
        .join(' | ');
      return [`Active plan summary: ${total}`, dayLines ? `Per day macros: ${dayLines}` : '']
        .filter(Boolean)
        .join('. ');
    } catch (err) {
      this.logger.warn(`[explain] could not load plan for user ${userId}: ${(err as Error).message}`);
      return '';
    }
  };

  private shouldUsePlanContext(message: string, extraContext?: string) {
    const text = `${message || ''} ${extraContext || ''}`.toLowerCase();
    if (text.length < 12) return false;
    const keywords = [
      'plan',
      'meal',
      'macro',
      'protein',
      'carb',
      'fat',
      'kcal',
      'calorie',
      'calories',
      'workout',
      'gym',
      'training',
      'recover',
      'leg day',
      'day ',
      'cut',
      'cutting',
      'bulk',
      'bulking',
      'maintenance',
      'maintain weight',
      'surplus',
      'deficit',
    ];
    return keywords.some((k) => text.includes(k));
  }

  private async buildExplainContext(message: string, context?: string, userId?: string) {
    const includePlan = this.shouldUsePlanContext(message, context);
    let planCtx = '';
    let targetCtx = '';

    if (includePlan && userId) {
      planCtx = await this.summarizePlanContext(userId);
      try {
        const profile = await this.usersService.getProfile(userId);
        const targets = calculateTargets(profile || {});
        const delta = targets.calorieDelta;
        const deltaText =
          delta === 0
            ? 'at maintenance'
            : delta > 0
              ? `~${delta} kcal above maintenance (surplus)`
              : `~${Math.abs(delta)} kcal below maintenance (deficit)`;
        targetCtx = `Targets: maintenance ${targets.maintenanceCalories} kcal/day, goal ${targets.dailyCalories} kcal/day (${deltaText}), protein target ${targets.dailyProtein}g/day.`;
      } catch (err) {
        this.logger.warn(`[explain] could not load profile/targets for user ${userId}: ${(err as Error).message}`);
      }
    }

    const mergedContext = [context, planCtx, targetCtx].filter(Boolean).join(' ');
    return { mergedContext, includePlan, ctxLength: mergedContext.length };
  }

  async explain(message: string, context?: string, userId?: string) {
    this.logAgent('explain', `start user=${userId || 'none'} msg="${message.slice(0, 120)}"`);
    const client = this.createClient('explain');
    const chat = new ChatOpenAI(
      this.buildChatOptions(client, { temperature: 0.4 }),
    );

    const { mergedContext, includePlan, ctxLength } = await this.buildExplainContext(message, context, userId);

    const system = EXPLAIN_SYSTEM_PROMPT;

    const prompt = [
      new SystemMessage(system),
      new HumanMessage(
        JSON.stringify({
          question: message,
          context: mergedContext || undefined,
        }),
      ),
    ];

    const start = Date.now();
    const res = await chat.invoke(prompt);
    const content = typeof res.content === 'string' ? res.content : JSON.stringify(res.content);
    this.logAgent(
      'explain',
      `model=${client.model} latency_ms=${Date.now() - start} includePlan=${includePlan} ctxLen=${ctxLength} replyPreview="${(content || '').slice(0, 120)}"`,
    );
    const reply = { reply: content };
    if (userId && String(reply).trim().length > 0) {
      await this.profileService.chargeCredit(userId, CREDIT_COSTS.explain);
    }
    return reply;
  }

  async interpretReviewAction(payload: {
    userId?: string;
    weeklyPlanId?: string;
    actionContext: any;
    note?: string;
    profileSnippet?: any;
  currentPlanSummary?: any;
}): Promise<ReviewInstruction> {
    const hasNote = typeof payload.note === 'string' && payload.note.trim().length > 0;
    const hasExplicitTarget =
      !!payload.actionContext?.planMealId ||
      !!payload.actionContext?.planDayId ||
      (Array.isArray(payload.actionContext?.planDayIds) && payload.actionContext.planDayIds.length > 0);

    const requestBody = {
      userId: payload.userId,
      weeklyPlanId: payload.weeklyPlanId,
      actionContext: payload.actionContext,
      note: payload.note,
      profileSnippet: payload.profileSnippet,
      currentPlanSummary: payload.currentPlanSummary,
      meta: {
        hasNote,
        hasExplicitTarget,
      },
    };

    // DEBUG: see what we actually send
    this.logger.debug(`[review] requestBody=${JSON.stringify(requestBody).substring(0, 2000)}...`);

    const prompt: { role: 'system' | 'user'; content: string }[] = [
      {
        role: 'system',
        content: REVIEW_SYSTEM_PROMPT,
      },
      {
        role: 'user',
        content: JSON.stringify(requestBody),
      },
    ];

    const maxRetries = 5;
    let raw: any;
    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      try {
        raw = await this.callModel(this.reviewModel, prompt, 'review');
        this.logAgent('review', `model=${this.reviewModel}`);
        break;
      } catch (err) {
        this.logger.warn(
          `[review] interpretReviewAction attempt=${attempt + 1} failed err=${(err as any)?.message || err}`,
        );
        if (attempt >= maxRetries) {
          throw err;
        }
      }
    }

    // DEBUG: see model raw JSON
    this.logger.debug(`[review] rawResponse=${JSON.stringify(raw).substring(0, 2000)}...`);

    // Normalise fields before validation
    const normalizedInput: any = { ...raw };
    if (normalizedInput.targetIds && normalizedInput.targetIds.planWeekId && !normalizedInput.targetIds.weeklyPlanId) {
      normalizedInput.targetIds.weeklyPlanId = normalizedInput.targetIds.planWeekId;
      delete normalizedInput.targetIds.planWeekId;
    }
    if (normalizedInput.targetIds && normalizedInput.targetIds.planMealId === null) {
      delete normalizedInput.targetIds.planMealId;
    }
    if (normalizedInput.targetIds && normalizedInput.targetIds.planDayIds === null) {
      delete normalizedInput.targetIds.planDayIds;
    }

    const parsedRaw = reviewInstructionSchema.parse(normalizedInput);

    // Normalize notes to a single string
    const normalized: ReviewInstruction = {
      ...parsedRaw,
      targetIds: parsedRaw.targetIds || (raw as any)?.targetIds || (raw as any)?.targets || undefined,
      notes: Array.isArray(parsedRaw.notes)
        ? parsedRaw.notes.length
          ? parsedRaw.notes.join(' ')
          : undefined
        : parsedRaw.notes,
    };
    this.logger.debug(`[review] parsedInstruction=${JSON.stringify(normalized).substring(0, 2000)}...`);

    return normalized;
  }

  async generateRecipe(payload: {
    note?: string;
    meal_slot?: string;
    meal_type?: string;
    difficulty?: string;
    budget_per_meal?: number;
    userId?: string;
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
        content: RECIPE_GENERATOR_SYSTEM_PROMPT,
      },
      { role: 'user', content: JSON.stringify(payload) },
    ];
    const maxRetries = 5;
    let lastErr: any;
    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      try {
        const raw = await this.callModel(this.reviewModel, prompt, 'review');
        this.logger.log(
          `[review] generateRecipe raw=${JSON.stringify(raw)} input=${JSON.stringify(payload)} attempt=${attempt + 1}`,
        );
        const parsed = schema.parse(raw);
        if (payload.userId) {
          await this.profileService.chargeCredit(payload.userId, CREDIT_COSTS.recipeGeneration);
        }
        return parsed;
      } catch (err) {
        lastErr = err;
        this.logger.error(
          `[review] generateRecipe parse_failed attempt=${attempt + 1} err=${(err as any)?.message || err}`,
        );
      }
    }
    throw lastErr;
  }

  async describeImage(payload: { imageBase64: string; note?: string; userId?: string }) {
    if (!payload.imageBase64) throw new Error('Image is required');
    const visionClient = this.createClient('vision');
    const imageData = `data:image/jpeg;base64,${payload.imageBase64}`;
    const imageField =
      visionClient.provider === 'openai'
        ? { type: 'image_url', image_url: { url: imageData } }
        : { type: 'image_url', image_url: imageData };
    const prompt = [
      new SystemMessage(
        'You are a food vision model. Return ONE short sentence (max ~270 chars) naming the dish and 2-4 key ingredients or toppings. ' +
          'Focus on the food only. Avoid camera/setting words.',
      ),
      new HumanMessage({
        content: [{ type: 'text', text: payload.note || 'Describe this dish.' }, imageField],
      }),
    ];

    const visionOptions = visionClient.provider === 'openai' ? {} : { temperature: 0 };
    const llm = new ChatOpenAI(this.buildChatOptions(visionClient, visionOptions));

    const res = await llm.invoke(prompt);
    const text = (res as any)?.content || (res as any)?.text || '';
    const clean = text?.toString().replace(/\s+/g, ' ').trim() || 'Dish photo';
    this.logger.log(`[vision] describeImage -> ${clean.slice(0, 240)}`);
    if (payload.userId) {
      await this.profileService.chargeCredit(payload.userId, CREDIT_COSTS.vision);
    }
    return clean;
  }

  async generateIngredientEstimate(payload: {
    name: string;
    locale?: 'uk' | 'us';
  }) {
    const toNum = (v: any) => {
      if (v === null || v === undefined || v === '') return 0;
      const n = Number(v);
      return Number.isFinite(n) ? n : 0;
    };

    const schema = z.object({
      name: z.string(),
      category: z.string().optional(),
      kcal_per_100g: z.preprocess(toNum, z.number()),
      protein_per_100g: z.preprocess(toNum, z.number()),
      carbs_per_100g: z.preprocess(toNum, z.number()),
      fat_per_100g: z.preprocess(toNum, z.number()),
      estimated_price_per_100g_gbp: z.preprocess(toNum, z.number().optional()),
      allergen_keys: z.array(z.string()).optional(),
    });

    const prompt: { role: 'system' | 'user'; content: string }[] = [
      {
        role: 'system',
        content: INGREDIENT_ESTIMATOR_SYSTEM_PROMPT,
      },
      {
        role: 'user',
        content: JSON.stringify({
          name: payload.name,
          locale: payload.locale || 'uk',
        }),
      },
    ];

    const maxRetries = 5;
    let lastErr: any;

    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      try {
        const raw = await this.callModel(this.nutritionModel, prompt, 'nutrition');
        this.logger.log(
          `[nutrition] generateIngredientEstimate raw=${JSON.stringify(raw).substring(
            0,
            800,
          )} input=${JSON.stringify(payload)} attempt=${attempt + 1}`,
        );
        const parsed = schema.parse(raw);
        return parsed;
      } catch (err) {
        lastErr = err;
        this.logger.error(
          `[nutrition] generateIngredientEstimate parse_failed attempt=${
            attempt + 1
          } err=${(err as any)?.message || err}`,
        );
      }
    }

    throw lastErr;
  }

  async adjustRecipeWithContext(payload: {
    note: string;
    originalRecipe: {
      name: string;
      meal_slot: string;
      meal_type?: string | null;
      difficulty?: string | null;
      instructions?: string | string[] | null;
      ingredients: { ingredient_name: string; quantity: number; unit: string }[];
    };
    profileSnippet?: {
      goal?: string;
      dietType?: string;
      weeklyBudgetGbp?: number;
    };
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
        content: RECIPE_ADJUSTOR_SYSTEM_PROMPT,
      },
      {
        role: 'user',
        content: JSON.stringify(payload),
      },
    ];

    const maxRetries = 5;
    let lastErr: any;

    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      try {
        const raw = await this.callModel(this.reviewModel, prompt, 'review');
        this.logger.log(
          `[review] adjustRecipeWithContext raw=${JSON.stringify(raw).substring(
            0,
            1000,
          )} attempt=${attempt + 1}`,
        );
        return schema.parse(raw);
      } catch (err) {
        lastErr = err;
        this.logger.error(
          `[review] adjustRecipeWithContext parse_failed attempt=${attempt + 1} err=${(err as any)?.message || err}`,
        );
      }
    }

    throw lastErr;
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
    note?: string;
    userId?: string;
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
        content: DAY_COACH_SYSTEM_PROMPT,
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
          note: payload.note,
        }),
      },
    ];

    const retries = payload.maxRetries ?? 3;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt += 1) {
      try {
        const raw = await this.callModel(this.coachModel, prompt, 'coach');
        this.logAgent(
          'coach',
          `day_index=${payload.day_index} model=${this.coachModel} attempt=${attempt + 1}`,
        );

        const rawMeals = Array.isArray((raw as any)?.meals) ? (raw as any).meals : [];
        const requestedSlots = Array.isArray(payload.meal_slots)
          ? payload.meal_slots.map((s) => (typeof s === 'string' ? s.trim().toLowerCase() : '')).filter(Boolean)
          : [];
        const normalizeMealSlot = (slot: any, fallback: string) => {
          const val = typeof slot === 'string' ? slot.trim().toLowerCase() : '';
          if (['breakfast', 'lunch', 'dinner', 'snack'].includes(val)) return val;
          if (val === 'meal') return fallback || 'meal';
          return fallback || 'meal';
        };

        const normalizedMeals = rawMeals
          .filter((m: any) => m && typeof m === 'object' && !Array.isArray(m))
          .map((m: any, idx: number) => {
            const fallbackSlot = requestedSlots[idx] || requestedSlots[0] || 'dinner';
            return {
              meal_slot: normalizeMealSlot(m.meal_slot, fallbackSlot),
              name: m.name,
              difficulty:
                typeof m.difficulty === 'string'
                  ? m.difficulty.trim() || 'easy'
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
              compliance_notes:
                typeof m.compliance_notes === 'string'
                  ? m.compliance_notes
                  : Array.isArray(m.compliance_notes)
                    ? m.compliance_notes.length
                      ? m.compliance_notes.join(' ')
                      : undefined
                    : undefined,
            };
          });

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
          Array.isArray(requestedSlots) &&
          requestedSlots.length > 0 &&
          requestedSlots.every((slot) => normalizedMeals.some((m: any) => m.meal_slot === slot));
        const parsedOk = parsed.success && normalizedMeals.length > 0;

        if (parsedOk && unitsOk && slotsOk) {
          if (payload.userId) {
            await this.profileService.chargeCredit(payload.userId, CREDIT_COSTS.planGeneration.day);
          }
          return { ...parsed.data, meals: normalizedMeals };
        }

        this.logger.warn(
          `[coach] day_index=${payload.day_index} attempt=${attempt + 1} invalid or incomplete meals (parsedOk=${parsedOk} unitsOk=${unitsOk} slotsOk=${slotsOk})`,
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
    const chat = new ChatOpenAI(this.buildChatOptions(client, {}, { jsonResponse: true }));

    const lcMessages = messages.map((m) =>
      m.role === 'system' ? new SystemMessage(m.content) : new HumanMessage(m.content),
    );
    const start = Date.now();
    try {
      const res = await chat.invoke(lcMessages);
      let raw: any = (res as any)?.content ?? (res as any)?.text ?? '';
      if (Array.isArray(raw)) {
        raw = raw
          .map((blk: any) => {
            if (typeof blk === 'string') return blk;
            if (blk && typeof blk.text === 'string') return blk.text;
            if (blk && typeof blk.content === 'string') return blk.content;
            return '';
          })
          .join('');
      }

      if (!raw || (typeof raw === 'string' && !raw.trim())) {
        this.logAgent(
          kind,
          `empty or non-textual content model=${model} fullRes=${JSON.stringify(res).slice(0, 500)}...`,
        );
        throw new Error('LLM returned empty textual content');
      }

      const contentStr = typeof raw === 'string' ? raw : JSON.stringify(raw);
      const parsed = JSON.parse(contentStr);
      this.logAgent(kind, `success model=${model} provider=${client.provider} latency_ms=${Date.now() - start}`);
      return parsed;
    } catch (err) {
      this.logger.error(
        `[${kind}] model=${model} provider=${client.provider} failed: ${(err as Error).message}`,
      );
      throw err;
    }
  }

  private createClient(kind: 'review' | 'coach' | 'explain' | 'nutrition' | 'vision'): LlmClient {
    const provider = ['openai', 'cloud'].includes(this.provider) ? 'openai' : 'local';
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
            : kind === 'vision'
              ? this.visionModel
              : this.nutritionModel;
    return { baseUrl, apiKey, model, provider };
  }

  private buildChatOptions(
    client: LlmClient,
    overrides: Record<string, any> = {},
    options?: { jsonResponse?: boolean },
  ) {
    const {
      modelKwargs: overrideKwargs,
      maxTokens: overrideMaxTokens,
      maxCompletionTokens: overrideMaxCompletionTokens,
      temperature: overrideTemperature,
      ...rest
    } = overrides;

    const result: Record<string, any> = {
      model: client.model,
      apiKey: client.apiKey,
      configuration: { baseURL: client.baseUrl },
      ...rest,
    };
    if (overrideTemperature !== undefined) {
      if (client.provider === 'openai' && overrideTemperature !== 1) {
        this.logger.warn(
          `[agents] skipping temperature=${overrideTemperature} for openai model=${client.model} (only 1 supported)`,
        );
      } else {
        result.temperature = overrideTemperature;
      }
    }

    const responseFormat =
      options?.jsonResponse
        ? { response_format: { type: 'json_object' } }
        : undefined;

    if (client.provider === 'openai') {
      const modelKwargs = {
        max_completion_tokens:
          overrideMaxCompletionTokens ?? overrideMaxTokens ?? this.openaiMaxCompletionTokens,
        ...(responseFormat || {}),
        ...(overrideKwargs || {}),
      };
      result.modelKwargs = modelKwargs;
    } else {
      result.maxTokens = overrideMaxTokens ?? this.localMaxTokens;
      const modelKwargs = {
        ...(responseFormat || {}),
        ...(overrideKwargs || {}),
      };
      if (Object.keys(modelKwargs).length) {
        result.modelKwargs = modelKwargs;
      }
    }

    return result;
  }
}
