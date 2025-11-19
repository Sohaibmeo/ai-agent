import { v4 as uuid } from 'uuid';
import {
  GenerateWeekInput,
  PlanDay,
  PlanMeal,
  ReviewInstruction,
  WeeklyPlan
} from '../schemas';
import {
  Ingredient,
  MealSlot,
  Recipe,
  UserState,
  getPortionMultiplier
} from '../data/store';
import { priceAgent } from './priceAgent';

export interface CoachContext {
  user: UserState;
  recipes: Recipe[];
  ingredients: Ingredient[];
}

const difficultyOrder = ['super_easy', 'easy', 'medium', 'hard'] as const;

const difficultyIndex = (difficulty: string) =>
  difficultyOrder.findIndex((item) => item === difficulty);

const getMealSlots = (profile: GenerateWeekInput['profile']): MealSlot[] => {
  const slots: MealSlot[] = [];
  if (profile.enableBreakfast) slots.push('breakfast');
  if (profile.enableSnacks) slots.push('snack');
  if (profile.enableLunch) slots.push('lunch');
  if (profile.enableDinner) slots.push('dinner');
  return slots;
};

const sumNumbers = (values: number[]) =>
  Number(values.reduce((sum, val) => sum + (val || 0), 0).toFixed(2));

const toMealIngredient = (
  ingredientMeta: Ingredient | undefined,
  ingredientId: string,
  quantity: number,
  quantityUnit: string,
  context: CoachContext
) => {
  const name = ingredientMeta?.name ?? ingredientId;
  const kcal = ingredientMeta ? ingredientMeta.kcalPerUnit * quantity : undefined;
  const protein = ingredientMeta ? ingredientMeta.proteinPerUnit * quantity : undefined;
  const carbs = ingredientMeta ? ingredientMeta.carbsPerUnit * quantity : undefined;
  const fat = ingredientMeta ? ingredientMeta.fatPerUnit * quantity : undefined;
  const estimatedCost = priceAgent.estimateIngredientCost(
    { user: context.user, ingredientCatalog: context.ingredients },
    ingredientId,
    quantity
  );

  return {
    id: ingredientId,
    name,
    quantity: Number(quantity.toFixed(2)),
    quantityUnit,
    kcal,
    protein,
    carbs,
    fat,
    estimatedCost
  };
};

const chooseRecipe = (
  recipes: Recipe[],
  slot: MealSlot,
  profile: GenerateWeekInput['profile'],
  preferences: GenerateWeekInput['preferences'],
  dayIndex: number
) => {
  const allowedIndex = difficultyIndex(profile.recipeDifficulty);
  const dislikedCuisines = new Set(preferences.cuisinesDisliked.map((c) => c.toLowerCase()));

  const filtered = recipes.filter((recipe) => {
    if (recipe.mealSlot !== slot) {
      return false;
    }
    if (difficultyIndex(recipe.difficulty) > allowedIndex) {
      return false;
    }
    if (recipe.cuisine && dislikedCuisines.has(recipe.cuisine.toLowerCase())) {
      return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    return recipes.find((recipe) => recipe.mealSlot === slot) ?? recipes[0];
  }
  const pickIndex = dayIndex % filtered.length;
  return filtered[pickIndex];
};

const buildMeal = (
  recipe: Recipe,
  slot: MealSlot,
  profile: GenerateWeekInput['profile'],
  context: CoachContext
): PlanMeal => {
  const multiplier = getPortionMultiplier(profile.portionMode);
  const ingredientRefs = recipe.ingredients.map((ingredient) => {
    const ingredientMeta = context.ingredients.find((ing) => ing.id === ingredient.ingredientId);
    const scaledQuantity = ingredient.quantity * multiplier;
    return toMealIngredient(
      ingredientMeta,
      ingredient.ingredientId,
      scaledQuantity,
      ingredient.quantityUnit,
      context
    );
  });

  const kcal = sumNumbers(ingredientRefs.map((item) => item.kcal ?? 0));
  const protein = sumNumbers(ingredientRefs.map((item) => item.protein ?? 0));
  const carbs = sumNumbers(ingredientRefs.map((item) => item.carbs ?? 0));
  const fat = sumNumbers(ingredientRefs.map((item) => item.fat ?? 0));
  const estimatedCost = sumNumbers(ingredientRefs.map((item) => item.estimatedCost ?? 0));

  return {
    id: uuid(),
    mealType: slot,
    recipeId: recipe.id,
    recipeName: recipe.name,
    portionMultiplier: multiplier,
    ingredients: ingredientRefs,
    kcal,
    protein,
    carbs,
    fat,
    estimatedCost
  };
};

const buildDay = (
  dayIndex: number,
  input: GenerateWeekInput,
  context: CoachContext
): PlanDay => {
  const slots = getMealSlots(input.profile);
  const meals = slots.map((slot) => {
    const recipe = chooseRecipe(
      context.recipes,
      slot,
      input.profile,
      input.preferences,
      dayIndex
    );
    return buildMeal(recipe, slot, input.profile, context);
  });
  const dailyEstimatedCost = sumNumbers(meals.map((meal) => meal.estimatedCost ?? 0));
  const dailyKcal = sumNumbers(meals.map((meal) => meal.kcal ?? 0));
  return {
    id: uuid(),
    dayIndex,
    date: undefined,
    meals,
    dailyEstimatedCost,
    dailyKcal
  };
};

const recomputePlanTotals = (plan: WeeklyPlan) => {
  const totalCost = sumNumbers(
    plan.days.map((day) => day.dailyEstimatedCost ?? 0)
  );
  const totalKcal = sumNumbers(plan.days.map((day) => day.dailyKcal ?? 0));
  plan.totalEstimatedCost = totalCost;
  plan.totalKcal = totalKcal;
  return plan;
};

export const coachAgent = {
  generateWeek(input: GenerateWeekInput, context: CoachContext): WeeklyPlan {
    const days: PlanDay[] = [];
    for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
      days.push(buildDay(dayIndex, input, context));
    }
    const plan: WeeklyPlan = {
      id: uuid(),
      userId: input.userId,
      weekStartDate: new Date().toISOString().split('T')[0],
      status: 'draft',
      days,
      totalEstimatedCost: 0,
      totalKcal: 0
    };
    return recomputePlanTotals(plan);
  },
  regenerateDay(
    plan: WeeklyPlan,
    dayIndex: number,
    input: GenerateWeekInput,
    context: CoachContext
  ) {
    const dayPosition = plan.days.findIndex((day) => day.dayIndex === dayIndex);
    if (dayPosition === -1) return plan;
    plan.days[dayPosition] = buildDay(dayIndex, input, context);
    return recomputePlanTotals(plan);
  },
  regenerateMeal(
    plan: WeeklyPlan,
    dayIndex: number,
    mealType: MealSlot,
    input: GenerateWeekInput,
    context: CoachContext
  ) {
    const day = plan.days.find((currentDay) => currentDay.dayIndex === dayIndex);
    if (!day) return plan;
    const mealPosition = day.meals.findIndex((meal) => meal.mealType === mealType);
    if (mealPosition === -1) return plan;
    const recipe = chooseRecipe(context.recipes, mealType, input.profile, input.preferences, dayIndex);
    day.meals[mealPosition] = buildMeal(recipe, mealType, input.profile, context);
    day.dailyEstimatedCost = sumNumbers(day.meals.map((meal) => meal.estimatedCost ?? 0));
    day.dailyKcal = sumNumbers(day.meals.map((meal) => meal.kcal ?? 0));
    return recomputePlanTotals(plan);
  },
  applyIngredientInstruction(plan: WeeklyPlan, instruction: ReviewInstruction) {
    const params = instruction.params;
    if (!params) return plan;
    plan.days.forEach((day) => {
      day.meals.forEach((meal) => {
        meal.ingredients = meal.ingredients.map((ingredient) => {
          if (
            params.ingredientToRemove &&
            ingredient.name.toLowerCase().includes(params.ingredientToRemove)
          ) {
            if (instruction.action === 'remove_ingredient') {
              return { ...ingredient, quantity: 0, estimatedCost: 0 };
            }
            if (instruction.action === 'swap_ingredient' && params.ingredientToAdd) {
              return { ...ingredient, name: params.ingredientToAdd };
            }
          }
          return ingredient;
        });
        meal.estimatedCost = sumNumbers(meal.ingredients.map((item) => item.estimatedCost ?? 0));
        meal.kcal = sumNumbers(meal.ingredients.map((item) => item.kcal ?? 0));
        meal.protein = sumNumbers(meal.ingredients.map((item) => item.protein ?? 0));
        meal.carbs = sumNumbers(meal.ingredients.map((item) => item.carbs ?? 0));
        meal.fat = sumNumbers(meal.ingredients.map((item) => item.fat ?? 0));
      });
      day.dailyEstimatedCost = sumNumbers(day.meals.map((meal) => meal.estimatedCost ?? 0));
      day.dailyKcal = sumNumbers(day.meals.map((meal) => meal.kcal ?? 0));
    });
    return recomputePlanTotals(plan);
  }
};
