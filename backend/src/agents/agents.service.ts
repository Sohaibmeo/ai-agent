import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { z } from 'zod';
import { ExplanationRequestDto, ExplanationResponseDto } from './dto/explanation.dto';
import {
  NutritionAdviceItem,
  NutritionAdviceRequestDto,
  NutritionAdviceResponseDto,
} from './dto/nutrition-advice.dto';

const ReviewInstructionSchema = z.object({
  action: z.string(),
  targetMealId: z.string().optional(),
  notes: z.string().optional(),
  constraints: z.array(z.string()).optional(),
});

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
  private reviewModel = process.env.LLM_MODEL_REVIEW || 'llama3.1:8b-instruct-q4_K_M';
  private coachModel = process.env.LLM_MODEL_COACH || 'llama3.1:8b-instruct-q4_K_M';
  private explainModel = process.env.LLM_MODEL_EXPLAIN || this.coachModel;
  private nutritionModel = process.env.LLM_MODEL_NUTRITION || this.coachModel;
  private client = new OpenAI({
    baseURL: process.env.LLM_BASE_URL || 'http://localhost:11434/v1',
    apiKey: process.env.LLM_API_KEY || 'ollama',
  });

  async reviewAction(payload: { text?: string; currentPlanSnippet?: unknown }) {
    const prompt: { role: 'system' | 'user'; content: string }[] = [
      {
        role: 'system',
        content:
          'You are Review Agent. Return ONLY compact JSON matching {action, targetMealId?, notes?, constraints?}. No prose.',
      },
      {
        role: 'user',
        content: JSON.stringify({
          text: payload.text,
          currentPlanSnippet: payload.currentPlanSnippet,
        }),
      },
    ];
    const raw = await this.callModel(this.reviewModel, prompt);
    this.logger.log(`reviewAction called model=${this.reviewModel}`);
    return ReviewInstructionSchema.parse(raw);
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
    const raw = await this.callModel(this.coachModel, prompt);
    this.logger.log(`coachPlan called model=${this.coachModel}`);
    return WeeklyPlanSchema.parse(raw);
  }

  private async callModel(
    model: string,
    messages: { role: 'system' | 'user'; content: string }[],
  ): Promise<any> {
    const res = await this.client.chat.completions.create({
      model,
      messages,
      temperature: 0,
      max_tokens: 800,
      response_format: { type: 'json_object' },
    });
    const content = res.choices?.[0]?.message?.content;
    if (!content) throw new Error('LLM returned empty content');
    try {
      return JSON.parse(content);
    } catch (e) {
      throw new Error('Failed to parse LLM JSON');
    }
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
    const raw = await this.callModel(this.explainModel, prompt);
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
    const raw = await this.callModel(this.nutritionModel, prompt);
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
