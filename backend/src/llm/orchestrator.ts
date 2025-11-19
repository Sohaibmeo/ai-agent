import { DEMO_USER_ID } from '../constants.js';
import { getCurrentPlan, getWeeklyPlanById, markPlanStatus, saveWeeklyPlan } from '../db/repositories/planRepo.js';
import {
  getRecipesWithIngredients,
  listCatalogRecipes,
  RecipeWithIngredients,
} from '../db/repositories/recipeRepo.js';
import { rebuildShoppingListFromPlan } from '../db/repositories/shoppingListRepo.js';
import { getUserPreferences, getUserProfile } from '../db/repositories/userRepo.js';
import { runCoachAgent } from './coachAgent.js';
import { runReviewAgent } from './reviewAgent.js';
import {
  GenerateWeekInput,
  PlanActionContext,
  PlanActionContextSchema,
  PlanMeal,
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
  const recipes = await listCatalogRecipes(userId);
  const limitedRecipes = limitRecipes(recipes, RECIPE_LIMIT);

  return {
    ingredients: [],
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

function hydrateMealFromRecipe(meal: PlanMeal, recipe?: RecipeWithIngredients): PlanMeal {
  const portionMultiplier = meal.portionMultiplier ?? 1;
  const baseMeal: PlanMeal = {
    ...meal,
    portionMultiplier,
    ingredients: meal.ingredients ? [...meal.ingredients] : [],
  };

  if (!recipe) {
    baseMeal.ingredients = [];
    return baseMeal;
  }

  const updatedMeal: PlanMeal = { ...baseMeal };
  updatedMeal.recipeName = updatedMeal.recipeName || recipe.name;

  if (updatedMeal.kcal == null && recipe.baseKcal != null) {
    updatedMeal.kcal = Number(recipe.baseKcal) * portionMultiplier;
  }
  if (updatedMeal.protein == null && recipe.baseProtein != null) {
    updatedMeal.protein = Number(recipe.baseProtein) * portionMultiplier;
  }
  if (updatedMeal.carbs == null && recipe.baseCarbs != null) {
    updatedMeal.carbs = Number(recipe.baseCarbs) * portionMultiplier;
  }
  if (updatedMeal.fat == null && recipe.baseFat != null) {
    updatedMeal.fat = Number(recipe.baseFat) * portionMultiplier;
  }

  updatedMeal.ingredients = recipe.ingredients.map((ingredient) => {
    const estimatedCost =
      ingredient.unitPrice != null ? Number(ingredient.unitPrice) * ingredient.quantity * portionMultiplier : undefined;
    return {
      id: ingredient.ingredientId ?? undefined,
      name: ingredient.name,
      quantity: ingredient.quantity * portionMultiplier,
      quantityUnit: ingredient.quantityUnit,
      estimatedCost,
    };
  });

  const ingredientCost = updatedMeal.ingredients.reduce((sum, ingredient) => sum + (ingredient.estimatedCost ?? 0), 0);
  if (ingredientCost > 0) {
    updatedMeal.estimatedCost = ingredientCost;
  } else if (updatedMeal.estimatedCost == null && recipe.baseEstimatedCost != null) {
    updatedMeal.estimatedCost = Number(recipe.baseEstimatedCost) * portionMultiplier;
  }

  return updatedMeal;
}

function sumNumbers(values: Array<number | undefined>): number | undefined {
  let total = 0;
  for (const value of values) {
    if (typeof value === 'number' && !Number.isNaN(value)) {
      total += value;
    }
  }
  return total > 0 ? total : undefined;
}

async function hydratePlanWithRecipes(plan: WeeklyPlan): Promise<WeeklyPlan> {
  const recipeIds = new Set<string>();
  for (const day of plan.days) {
    for (const meal of day.meals) {
      if (meal.recipeId) {
        recipeIds.add(meal.recipeId);
      }
    }
  }

  if (!recipeIds.size) {
    return plan;
  }

  const recipes = await getRecipesWithIngredients([...recipeIds]);
  const recipeMap = new Map(recipes.map((recipe) => [recipe.id, recipe]));

  const hydratedDays = plan.days.map((day) => {
    const meals = day.meals.map((meal) => hydrateMealFromRecipe(meal, meal.recipeId ? recipeMap.get(meal.recipeId) : undefined));
    const dailyEstimatedCost = sumNumbers(meals.map((meal) => meal.estimatedCost));
    const dailyKcal = sumNumbers(meals.map((meal) => meal.kcal));
    return {
      ...day,
      meals,
      dailyEstimatedCost,
      dailyKcal,
    };
  });

  const totalEstimatedCost = sumNumbers(hydratedDays.map((day) => day.dailyEstimatedCost));
  const totalKcal = sumNumbers(hydratedDays.map((day) => day.dailyKcal));

  return {
    ...plan,
    days: hydratedDays,
    totalEstimatedCost,
    totalKcal,
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
  const hydratedPlan = await hydratePlanWithRecipes(coachPlan);
  return persistAndReload(userId, hydratedPlan);
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

  const hydratedPlan = await hydratePlanWithRecipes(updatedPlan);
  return persistAndReload(args.userId, hydratedPlan);
}

export async function getCurrentPlanForUser(userId: string) {
  return getCurrentPlan(userId);
}
