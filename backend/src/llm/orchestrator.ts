import { DEMO_USER_ID } from '../constants.js';
import { listCatalogIngredients } from '../db/repositories/ingredientRepo.js';
import { getCurrentPlan, getWeeklyPlanById, markPlanStatus, saveWeeklyPlan } from '../db/repositories/planRepo.js';
import { listCatalogRecipes } from '../db/repositories/recipeRepo.js';
import { rebuildShoppingListFromPlan } from '../db/repositories/shoppingListRepo.js';
import { getUserPreferences, getUserProfile } from '../db/repositories/userRepo.js';
import { runCoachAgent } from './coachAgent.js';
import { runReviewAgent } from './reviewAgent.js';
import {
  GenerateWeekInput,
  PlanActionContext,
  PlanActionContextSchema,
  ReviewInstruction,
  WeeklyPlan,
} from './schemas.js';

function getUpcomingMonday(date = new Date()): string {
  const day = date.getUTCDay();
  const diff = (day === 0 ? 1 : 8 - day) % 7; // days to next Monday
  const monday = new Date(date);
  monday.setUTCDate(date.getUTCDate() + (diff === 0 ? 0 : diff));
  return monday.toISOString().slice(0, 10);
}

const INGREDIENT_LIMIT = Number(process.env.CATALOG_INGREDIENT_LIMIT ?? 25);
const RECIPE_LIMIT = Number(process.env.CATALOG_RECIPE_LIMIT ?? 20);

type CatalogRecipe = Awaited<ReturnType<typeof listCatalogRecipes>>[number];

function limitRecipes(recipes: CatalogRecipe[], limit: number) {
  const buckets: Record<'breakfast' | 'snack' | 'lunch' | 'dinner', CatalogRecipe[]> = {
    breakfast: [],
    snack: [],
    lunch: [],
    dinner: [],
  };

  for (const recipe of recipes) {
    buckets[recipe.mealSlot as keyof typeof buckets].push(recipe);
  }

  const perBucket = Math.max(1, Math.floor(limit / 4));
  const selected: CatalogRecipe[] = [];

  for (const slot of ['breakfast', 'snack', 'lunch', 'dinner'] as const) {
    selected.push(...buckets[slot].slice(0, perBucket));
  }

  if (selected.length < limit) {
    selected.push(...recipes.filter((recipe) => !selected.includes(recipe)).slice(0, limit - selected.length));
  }

  return selected.slice(0, limit);
}

async function buildCatalog(userId: string) {
  const [ingredients, recipes] = await Promise.all([
    listCatalogIngredients(userId),
    listCatalogRecipes(userId),
  ]);

  const limitedIngredients = ingredients.slice(0, INGREDIENT_LIMIT);
  const limitedRecipes = limitRecipes(recipes, RECIPE_LIMIT);

  return {
    ingredients: limitedIngredients.map((ingredient) => ({
      id: ingredient.id,
      name: ingredient.name,
      unit: ingredient.unit,
      tags: ingredient.tags,
      kcalPerUnit: ingredient.kcalPerUnit,
      proteinPerUnit: ingredient.proteinPerUnit,
      carbsPerUnit: ingredient.carbsPerUnit,
      fatPerUnit: ingredient.fatPerUnit,
      estimatedPricePerUnit: ingredient.estimatedPricePerUnit,
    })),
    recipes: limitedRecipes.map((recipe) => ({
      id: recipe.id,
      name: recipe.name,
      mealSlot: recipe.mealSlot,
      difficulty: recipe.difficulty,
      baseKcal: recipe.baseKcal ?? undefined,
      baseProtein: recipe.baseProtein ?? undefined,
      baseCarbs: recipe.baseCarbs ?? undefined,
      baseFat: recipe.baseFat ?? undefined,
      baseEstimatedCost: recipe.baseEstimatedCost ?? undefined,
    })),
  } satisfies GenerateWeekInput['catalog'];
}

async function buildGenerateInput(userId: string): Promise<GenerateWeekInput> {
  const [profile, preferences, catalog] = await Promise.all([
    getUserProfile(userId),
    getUserPreferences(userId),
    buildCatalog(userId),
  ]);

  const mealSchedule = {
    breakfast: profile?.mealBreakfast ?? true,
    snack: profile?.mealSnack ?? true,
    lunch: profile?.mealLunch ?? true,
    dinner: profile?.mealDinner ?? true,
  };

  return {
    weekStartDate: getUpcomingMonday(),
    profile: {
      dietaryRequirement: profile?.dietaryRequirement ?? null,
      difficulty: profile?.recipeDifficulty ?? null,
      portionMode: profile?.portionMode ?? null,
      weeklyBudgetGbp: profile?.weeklyBudgetGbp ?? null,
      mealSchedule,
      ingredientsPreferred: preferences?.ingredientsPreferred ?? [],
      ingredientsAvoid: preferences?.ingredientsAvoid ?? [],
      cuisinesLiked: preferences?.cuisinesLiked ?? [],
      cuisinesDisliked: preferences?.cuisinesDisliked ?? [],
    },
    catalog,
  };
}

async function persistAndReload(userId: string, plan: WeeklyPlan): Promise<WeeklyPlan> {
  const planId = await saveWeeklyPlan(userId, plan);
  await rebuildShoppingListFromPlan(planId, { ...plan, id: planId });
  const persisted = await getWeeklyPlanById(planId);
  if (!persisted) {
    throw new Error('Failed to reload persisted plan');
  }
  return { ...persisted, id: planId };
}

export async function generateWeeklyPlan(userId: string = DEMO_USER_ID) {
  const generateInput = await buildGenerateInput(userId);
  const coachPlan = await runCoachAgent({
    mode: 'generate',
    generateInput,
    catalog: generateInput.catalog,
  });
  return persistAndReload(userId, coachPlan);
}

export async function handlePlanAction(args: {
  userId: string;
  weeklyPlanId: string;
  actionContext: PlanActionContext;
  reasonText?: string;
}) {
  const parsedContext = PlanActionContextSchema.parse(args.actionContext);
  const plan = await getWeeklyPlanById(args.weeklyPlanId);
  if (!plan) {
    throw new Error('Plan not found');
  }

  if (parsedContext.type === 'accept_week') {
    await markPlanStatus(args.weeklyPlanId, 'active');
    const updated = await getWeeklyPlanById(args.weeklyPlanId);
    if (!updated) throw new Error('Plan missing after status update');
    return updated;
  }

  const [profile, catalog] = await Promise.all([
    getUserProfile(args.userId),
    buildCatalog(args.userId),
  ]);

  const profileSnippet = {
    dietaryRequirement: profile?.dietaryRequirement ?? null,
    difficulty: profile?.recipeDifficulty ?? null,
    portionMode: profile?.portionMode ?? null,
    weeklyBudgetGbp: profile?.weeklyBudgetGbp ?? null,
  } satisfies Partial<Record<string, unknown>>;

  const reviewInstruction: ReviewInstruction = await runReviewAgent({
    actionContext: parsedContext,
    reasonText: args.reasonText,
    currentPlan: plan,
    profileSnippet,
  });

  const updatedPlan = await runCoachAgent({
    mode: 'regenerate',
    currentPlan: plan,
    instruction: reviewInstruction,
    catalog,
  });

  return persistAndReload(args.userId, updatedPlan);
}

export async function getCurrentPlanForUser(userId: string) {
  return getCurrentPlan(userId);
}
