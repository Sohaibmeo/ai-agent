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

  async interpretPlanChange(payload: { note: string }) {
    const actionSchema = z.object({
      action: z.enum([
        'regenerate_week',
        'regenerate_day',
        'regenerate_meal',
        'swap_meal',
        'swap_ingredient',
        'remove_ingredient',
        'adjust_recipe',
        'adjust_macros',
        'set_meal_type',
        'avoid_ingredient_future',
        'lock_meal',
        'lock_day',
        'set_fixed_breakfast',
        'no_change_clarify',
        'no_detectable_action',
      ]),
      targetLevel: z.enum(['week', 'day', 'meal', 'recipe']).optional(),
      avoidIngredients: z.array(z.string()).optional(),
      modifiers: z.record(z.string(), z.any()).optional(),
      notes: z.string().optional(),
    });
    const schema = z.object({
      actions: z.array(actionSchema).nonempty(),
    });
    const prompt: { role: 'system' | 'user'; content: string }[] = [
      {
        role: 'system',
        content:
          'You are Review Orchestrator. Given a user note, map it to ONE action from the provided list and return ONLY JSON.\n' +
          'Allowed actions: regenerate_week, regenerate_day, regenerate_meal, swap_meal, swap_ingredient, remove_ingredient, adjust_recipe, adjust_macros, set_meal_type, avoid_ingredient_future, no_detectable_action.\n' +
          'Additional actions you may emit: lock_meal, lock_day, set_fixed_breakfast, no_change_clarify.\n' +
          'Use modifiers for macro tweaks (higher_protein, lower_carbs), meal type hints (prefer_meal_type="solid|drinkable"), or constraints (fixed_breakfast="protein shake").\n' +
          'Return JSON: { actions: [ {action, targetLevel?, avoidIngredients?, modifiers?, notes?}, ... ] }. Do not invent IDs.',
      },
      {
        role: 'user',
        content: JSON.stringify(payload),
      },
    ];
    const raw = await this.callModel(this.reviewModel, prompt, 'review');
    return schema.parse(raw);
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
}
