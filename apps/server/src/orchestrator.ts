import { coachAgent } from './agents/coachAgent';
import { reviewAgent } from './agents/reviewAgent';
import { mockDb } from './data/store';
import {
  GenerateWeekInput,
  ReviewInstruction,
  ShoppingList,
  WeeklyPlan,
  WeeklyPlanSchema
} from './schemas';

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
  return shoppingList;
};

const runValidation = (userId: string, plan: WeeklyPlan) => {
  const input = buildGenerateInput(userId);
  const avoidList = reviewAgent.buildAvoidList(input);
  return reviewAgent.validatePlan(plan, {
    profile: input.profile,
    avoidList
  });
};

export const orchestrator = {
  getUser(userId: string) {
    return mockDb.getUser(userId);
  },
  upsertUserProfile(userId: string, payload: GenerateWeekInput['profile']) {
    const current = mockDb.getUser(userId);
    if (!current) {
      throw new Error('User not found');
    }
    current.profile = payload;
    mockDb.upsertUser(current);
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
    return current;
  },
  generateNewWeek(userId: string) {
    const input = buildGenerateInput(userId);
    const context = buildCoachContext(userId);
    const plan = coachAgent.generateWeek(input, context);
    const shoppingList = persistPlan(plan);
    const validation = runValidation(userId, plan);
    return { plan, shoppingList, validation };
  },
  applyInstruction(userId: string, instruction: ReviewInstruction) {
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
        break;
      case 'regenerate_day': {
        const planDayId = instruction.targetIds?.planDayId;
        if (!planDayId) break;
        const day = plan.days.find((item) => item.id === planDayId);
        if (day) {
          plan = coachAgent.regenerateDay(plan, day.dayIndex, input, context);
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
        }
        break;
      }
      case 'swap_ingredient':
      case 'remove_ingredient':
        plan = coachAgent.applyIngredientInstruction(plan, instruction);
        break;
      default:
        plan = coachAgent.generateWeek(input, context);
    }

    const shoppingList = persistPlan(plan);
    const validation = runValidation(userId, plan);
    return { plan, shoppingList, validation };
  },
  getShoppingList(planId: string): ShoppingList | undefined {
    return mockDb.getShoppingList(planId);
  },
  getPlan(planId: string) {
    return mockDb.getWeeklyPlan(planId);
  }
};
