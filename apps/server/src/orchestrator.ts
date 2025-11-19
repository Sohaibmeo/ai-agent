import { coachAgent } from './agents/coachAgent';
import { reviewAgent } from './agents/reviewAgent';
import { mockDb } from './data/store';
import { logger } from './logger';
import {
  GenerateWeekInput,
  ReviewInstruction,
  ShoppingList,
  WeeklyPlan,
  WeeklyPlanSchema
} from './schemas';

const orchestratorLog = logger.child({ scope: 'orchestrator' });

const buildGenerateInput = (userId: string): GenerateWeekInput => {
  const user = mockDb.getUser(userId);
  if (!user) {
    throw new Error(`User ${userId} not found`);
  }
  return {
    userId,
    profile: user.profile,
    preferences: user.preferences
  };
};

const buildCoachContext = (userId: string) => {
  const user = mockDb.getUser(userId);
  if (!user) {
    throw new Error(`User ${userId} not found`);
  }
  return {
    user,
    recipes: mockDb.listRecipes(),
    ingredients: mockDb.listIngredients()
  };
};

const persistPlan = (plan: WeeklyPlan) => {
  WeeklyPlanSchema.parse(plan);
  mockDb.saveWeeklyPlan(plan);
  const shoppingList = mockDb.createShoppingListFromPlan(plan);
  mockDb.saveShoppingList(shoppingList);
  orchestratorLog.info(
    {
      action: 'persist-plan',
      planId: plan.id,
      userId: plan.userId,
      totalCost: plan.totalEstimatedCost,
      totalKcal: plan.totalKcal
    },
    'Persisted plan and shopping list'
  );
  return shoppingList;
};

const runValidation = (userId: string, plan: WeeklyPlan) => {
  const input = buildGenerateInput(userId);
  const avoidList = reviewAgent.buildAvoidList(input);
  const result = reviewAgent.validatePlan(plan, {
    profile: input.profile,
    avoidList
  });
  if (!result.valid) {
    orchestratorLog.warn(
      { action: 'validate-plan', planId: plan.id, issues: result.issues },
      'Validation failed'
    );
  } else {
    orchestratorLog.info(
      { action: 'validate-plan', planId: plan.id },
      'Plan validated successfully'
    );
  }
  return result;
};

export const orchestrator = {
  getUser(userId: string) {
    orchestratorLog.debug({ action: 'get-user', userId }, 'Fetching user');
    return mockDb.getUser(userId);
  },
  upsertUserProfile(userId: string, payload: GenerateWeekInput['profile']) {
    const current = mockDb.getUser(userId);
    if (!current) {
      throw new Error('User not found');
    }
    current.profile = payload;
    mockDb.upsertUser(current);
    orchestratorLog.info({ action: 'update-profile', userId }, 'Profile updated');
    return current;
  },
  upsertUserPreferences(
    userId: string,
    payload: GenerateWeekInput['preferences']
  ) {
    const current = mockDb.getUser(userId);
    if (!current) {
      throw new Error('User not found');
    }
    current.preferences = payload;
    mockDb.upsertUser(current);
    orchestratorLog.info({ action: 'update-preferences', userId }, 'Preferences updated');
    return current;
  },
  generateNewWeek(userId: string) {
    orchestratorLog.info({ action: 'generate-week', userId }, 'Generating weekly plan');
    const input = buildGenerateInput(userId);
    const context = buildCoachContext(userId);
    const plan = coachAgent.generateWeek(input, context);
    const shoppingList = persistPlan(plan);
    const validation = runValidation(userId, plan);
    return { plan, shoppingList, validation };
  },
  applyInstruction(userId: string, instruction: ReviewInstruction) {
    orchestratorLog.info(
      { action: 'apply-instruction', userId, instruction: instruction.action },
      'Applying instruction'
    );
    const user = mockDb.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }
    const input = buildGenerateInput(userId);
    const context = buildCoachContext(userId);
    let plan =
      (instruction.targetIds?.weeklyPlanId &&
        mockDb.getWeeklyPlan(instruction.targetIds.weeklyPlanId)) ||
      (user.lastPlanId && mockDb.getWeeklyPlan(user.lastPlanId));

    if (!plan || instruction.action === 'generate_new_week') {
      return this.generateNewWeek(userId);
    }

    switch (instruction.action) {
      case 'regenerate_week':
        plan = coachAgent.generateWeek(input, context);
        orchestratorLog.info({ action: 'regenerate-week', planId: plan.id }, 'Regenerated week');
        break;
      case 'regenerate_day': {
        const planDayId = instruction.targetIds?.planDayId;
        if (!planDayId) break;
        const day = plan.days.find((item) => item.id === planDayId);
        if (day) {
          plan = coachAgent.regenerateDay(plan, day.dayIndex, input, context);
          orchestratorLog.info({ action: 'regenerate-day', dayIndex: day.dayIndex }, 'Day updated');
        }
        break;
      }
      case 'regenerate_meal': {
        const planDayId = instruction.targetIds?.planDayId;
        const planMealId = instruction.targetIds?.planMealId;
        if (!planDayId || !planMealId) break;
        const day = plan.days.find((item) => item.id === planDayId);
        const meal = day?.meals.find((item) => item.id === planMealId);
        if (day && meal) {
          plan = coachAgent.regenerateMeal(
            plan,
            day.dayIndex,
            meal.mealType,
            input,
            context
          );
          orchestratorLog.info(
            { action: 'regenerate-meal', dayIndex: day.dayIndex, mealType: meal.mealType },
            'Meal updated'
          );
        }
        break;
      }
      case 'swap_ingredient':
      case 'remove_ingredient':
        plan = coachAgent.applyIngredientInstruction(plan, instruction);
        orchestratorLog.info(
          { action: instruction.action, ingredient: instruction.params?.ingredientToRemove },
          'Ingredient update applied'
        );
        break;
      default:
        plan = coachAgent.generateWeek(input, context);
        orchestratorLog.info({ action: 'generate-week', userId }, 'Fallback regenerate week');
    }

    const shoppingList = persistPlan(plan);
    const validation = runValidation(userId, plan);
    return { plan, shoppingList, validation };
  },
  getShoppingList(planId: string): ShoppingList | undefined {
    orchestratorLog.debug({ action: 'get-shopping-list', planId }, 'Fetching shopping list');
    return mockDb.getShoppingList(planId);
  },
  getPlan(planId: string) {
    orchestratorLog.debug({ action: 'get-plan', planId }, 'Fetching plan');
    return mockDb.getWeeklyPlan(planId);
  }
};
