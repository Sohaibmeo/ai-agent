import { StructuredOutputParser } from 'langchain/output_parsers';

import { createLLM } from './llmClient.js';
import { GenerateWeekInput, PlanMeal, ReviewInstruction, WeeklyPlan, WeeklyPlanSchema } from './schemas.js';

const parser = StructuredOutputParser.fromZodSchema(WeeklyPlanSchema);
const formatInstructions = parser.getFormatInstructions();

const examplePlan = {
  weekStartDate: '2025-01-06',
  totalEstimatedCost: 42,
  totalKcal: 9500,
  status: 'draft',
  days: [
    {
      dayIndex: 0,
      date: '2025-01-06',
      dailyEstimatedCost: 6.2,
      dailyKcal: 1350,
      meals: [
        {
          mealType: 'breakfast',
          recipeId: 'example-breakfast',
          recipeName: 'Example Oats Bowl',
          portionMultiplier: 1,
          kcal: 350,
          protein: 22,
          carbs: 48,
          fat: 11,
          estimatedCost: 1.3,
          ingredients: [],
        },
        {
          mealType: 'lunch',
          recipeId: 'example-lunch',
          recipeName: 'Green Salad Bowl',
          portionMultiplier: 1,
          kcal: 450,
          protein: 25,
          carbs: 40,
          fat: 18,
          estimatedCost: 2.1,
          ingredients: [],
        },
      ],
    },
  ],
};

const examplePlanJson = JSON.stringify(examplePlan, null, 2);

function formatMealSummary(meal: PlanMeal) {
  const macroText = `kcal=${meal.kcal ?? 'n/a'}, protein=${meal.protein ?? 'n/a'}, cost=${meal.estimatedCost ?? 'n/a'}`;
  const ingredientPreview = (meal.ingredients ?? [])
    .slice(0, 2)
    .map((ingredient) => ingredient.name)
    .join(', ');
  return `${meal.mealType}: ${meal.recipeName} (${macroText}) ingredients: ${ingredientPreview}`;
}

function formatPlanSummary(plan?: WeeklyPlan) {
  if (!plan) return 'none';
  return plan.days
    .map((day) => {
      const meals = day.meals.map(formatMealSummary).join(' | ');
      return `Day ${day.dayIndex} (${day.date ?? 'n/a'}) cost=${day.dailyEstimatedCost ?? 'n/a'}: ${meals}`;
    })
    .join('\n');
}

function formatGenerateInputSummary(input?: GenerateWeekInput) {
  if (!input) return 'none';
  const profile = input.profile;
  return [
    `Week start: ${input.weekStartDate}`,
    `Diet=${profile.dietaryRequirement ?? 'none'}, difficulty=${profile.difficulty ?? 'any'}, portionMode=${profile.portionMode ?? 'maintenance'}, weeklyBudget=${profile.weeklyBudgetGbp ?? 'unset'}`,
    `Meal schedule: breakfast=${profile.mealSchedule.breakfast}, snack=${profile.mealSchedule.snack}, lunch=${profile.mealSchedule.lunch}, dinner=${profile.mealSchedule.dinner}`,
    `Preferred ingredients: ${(profile.ingredientsPreferred || []).slice(0, 8).join(', ') || 'none'}`,
    `Avoid ingredients: ${(profile.ingredientsAvoid || []).slice(0, 8).join(', ') || 'none'}`,
  ].join('\n');
}

function formatCatalogForPrompt(catalog: GenerateWeekInput['catalog']) {
  const recipeLines = catalog.recipes
    .map(
      (recipe) =>
        `${recipe.id}: ${recipe.name} [${recipe.mealSlot}, ${recipe.difficulty}] kcal=${recipe.baseKcal ?? 'n/a'}, protein=${recipe.baseProtein ?? 'n/a'}, cost=${recipe.baseEstimatedCost ?? 'n/a'}`,
    )
    .join('\n');
  return `Recipes (reference by id):\n${recipeLines}\nIngredient breakdown is handled server-side.`;
}

export interface CoachAgentArgs {
  mode: 'generate' | 'regenerate';
  generateInput?: GenerateWeekInput;
  currentPlan?: WeeklyPlan;
  instruction?: ReviewInstruction;
  catalog: GenerateWeekInput['catalog'];
}

function messageContentToString(content: unknown): string {
  if (typeof content === 'string') {
    return content;
  }
  if (Array.isArray(content)) {
    return content
      .map((chunk) => {
        if (typeof chunk === 'string') return chunk;
        if (typeof chunk === 'object' && chunk && 'text' in chunk && typeof chunk.text === 'string') {
          return chunk.text;
        }
        return '';
      })
      .join('')
      .trim();
  }
  return '';
}

function logUsage(agent: string, message: unknown, defaultModel: string) {
  const usage = (message as { usageMetadata?: { inputTokens?: number; outputTokens?: number } }).usageMetadata;
  const responseMetadata = (message as { response_metadata?: { model?: string } }).response_metadata;
  if (!usage) {
    return;
  }
  console.log('LLM usage', {
    agent,
    model: responseMetadata?.model ?? defaultModel,
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
  });
}

async function invokeCoachLLM(args: CoachAgentArgs, retryHint?: string) {
  const model = process.env.COACH_MODEL || 'gpt-5-mini';
  const llm = createLLM(model);
  const profileSummary = formatGenerateInputSummary(args.generateInput);
  const planSummary = formatPlanSummary(args.currentPlan);
  const catalogSummary = formatCatalogForPrompt(args.catalog);
  const instructions = [
    'You are the Coach Agent for a UK budget-aware meal planner. Produce a 7-day WeeklyPlan JSON strictly following the schema.',
    formatInstructions,
    'Example valid WeeklyPlan JSON (respond with a similar structure, no code fences):',
    examplePlanJson,
    'Hard requirements:',
    '- Exactly 7 days starting at weekStartDate with sequential dayIndex 0-6.',
    '- Populate meals only for enabled meal schedule slots.',
    '- Use only recipes/ingredients from catalog; adjust costs/macros by portionMultiplier.',
    '- Numeric fields must be plain numbers (no strings).',
    '- Always set meal.recipeId to a recipe from the catalog. Set meal.ingredients to [] (the backend fills actual ingredient lists and costs).',
    retryHint ? `Previous output was invalid: ${retryHint}. Respond with JSON only.` : 'Respond with JSON only. Start with "{" and end with "}".',
    '',
    `Mode: ${args.mode}`,
    `Profile + constraints:\n${profileSummary}`,
    `Current plan summary:\n${planSummary}`,
    `Review instruction: ${JSON.stringify(args.instruction ?? null)}`,
    `Catalog summary:\n${catalogSummary}`,
  ].join('\n');
  const llmResponse = await llm.invoke(instructions);
  logUsage('coach', llmResponse, model);
  return messageContentToString(llmResponse.content);
}

export async function runCoachAgent(args: CoachAgentArgs): Promise<WeeklyPlan> {
  let lastError: unknown;
  for (const retryHint of [undefined, 'Return valid WeeklyPlan JSON exactly as specified']) {
    const text = await invokeCoachLLM(args, retryHint);
    try {
      const parsed = await parser.parse(text);
      return WeeklyPlanSchema.parse(parsed);
    } catch (error) {
      console.error('Coach agent output parsing failed', { error, rawOutput: text });
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Coach agent failed to produce valid plan');
}
