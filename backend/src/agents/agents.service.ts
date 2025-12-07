import { Injectable, Logger } from '@nestjs/common';
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
        content:
          'You are Review Orchestrator.\n' +
          '\n' +
          'GOAL:\n' +
          '- Map a user plan-change request into exactly ONE JSON instruction.\n' +
          '- You receive: actionContext (where user clicked), note (what they typed), and profile/plan info.\n' +
          '\n' +
          'FORMAT RULES:\n' +
          '- Reply MUST be a single valid JSON object matching ReviewInstruction.\n' +
          '- No markdown, no backticks, no extra text, no comments.\n' +
          '\n' +
          'ACTIONS:\n' +
          '- regenerate_week, regenerate_day, regenerate_meal\n' +
          '- swap_meal (pick a different recipe for this meal)\n' +
          '- swap_ingredient (replace one ingredient with another)\n' +
          '- remove_ingredient (remove one ingredient)\n' +
          '- adjust_recipe (more complex recipe edits)\n' +
          '- adjust_macros, set_meal_type, avoid_ingredient_future\n' +
          '- lock_meal, lock_day, set_fixed_breakfast\n' +
          '- no_change_clarify, no_detectable_action\n' +
          '\n' +
          'FIELDS CONSTRAINTS:\n' +
          '- "notes" MUST be a single string if present (not an array).\n' +
          '- "modifiers" MUST be a flat object, e.g. { "ingredientToRemove": "x", "ingredientToAdd": "y" }.\n' +
          '- Do NOT use nested "adjustment" arrays or nested objects for simple ingredient swaps.\n' +
          '- If the user wants to remake a recipe with different macros or quantities, use:\n' +
          '  { "action": "adjust_recipe", "targetLevel": "meal", "targetIds": { "planMealId": ... }, "notes": "...explanation..." }\n' +
          '  and leave "modifiers" empty, so the backend can do a context-aware adjust.\n' +
          '\n' +
          'MAPPING HINTS:\n' +
          '- If user note is like "remove X", "remove X add Y", "swap X for Y", PREFER action="swap_ingredient".\n' +
          '  - For swap_ingredient, set targetLevel="meal".\n' +
          '  - Put the meal ID into targetIds.planMealId.\n' +
          '  - Use modifiers.ingredientToRemove and modifiers.ingredientToAdd.\n' +
          '- Use action="adjust_recipe" ONLY when the user wants deeper edits (change cooking method, rewrite instructions, or multi-step changes) that cannot be expressed as a simple ingredient swap.\n' +
          '\n' +
          'TARGET RULES:\n' +
          '- Use targetLevel = "week", "day", "meal", or "recipe".\n' +
          '- Never invent IDs; only use IDs from actionContext or weeklyPlanId.\n' +
          '- For multiple days, use targetIds.planDayIds.\n' +
          '\n' +
          'SAFETY RULE:\n' +
          '- If meta.hasNote==true OR meta.hasExplicitTarget==true, you MUST NOT return action="no_detectable_action".\n' +
          '- Prefer a best-effort action instead.\n',
      },
      {
        role: 'user',
        content: JSON.stringify(requestBody),
      },
    ];

    const maxRetries = 3;
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
          'You are Recipe Generator. Return ONLY JSON with {name, meal_slot, meal_type?, difficulty?, base_cost_gbp?, instructions, ingredients:[{ingredient_name, quantity, unit}]}. ' +
          'All ingredient quantities MUST be in grams ("g"). Set unit="g" for every ingredient. Use concise instructions. Do not invent IDs.',
      },
      { role: 'user', content: JSON.stringify(payload) },
    ];
    const maxRetries = 3;
    let lastErr: any;
    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      try {
        const raw = await this.callModel(this.reviewModel, prompt, 'review');
        this.logger.log(
          `[review] generateRecipe raw=${JSON.stringify(raw)} input=${JSON.stringify(payload)} attempt=${attempt + 1}`,
        );
        return schema.parse(raw);
      } catch (err) {
        lastErr = err;
        this.logger.error(
          `[review] generateRecipe parse_failed attempt=${attempt + 1} err=${(err as any)?.message || err}`,
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
        content:
          'You are Recipe Adjustor.\n' +
          '- You receive an EXISTING recipe and a user note.\n' +
          '- Your job is to RETURN A MODIFIED VERSION of THAT SAME RECIPE.\n' +
          '- Keep the core idea and style unless the note explicitly asks for a completely different dish.\n' +
          '- Prefer minimal changes: tweak ingredients, quantities, or instructions just enough to satisfy the note.\n' +
          '- Preserve reasonable macros and budget; do not drastically increase cost or calories without reason.\n' +
          '- Respond ONLY with JSON: {name, meal_slot, meal_type?, difficulty?, base_cost_gbp?, instructions, ingredients:[{ingredient_name, quantity, unit}]}. ' +
          'All ingredient quantities MUST be in grams ("g"). Set unit="g" for every ingredient.',
      },
      {
        role: 'user',
        content: JSON.stringify(payload),
      },
    ];

    const maxRetries = 3;
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
        '- If a note is provided, incorporate those user instructions and preferences explicitly.\n' +
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
}
