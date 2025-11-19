import {
  GenerateWeekInput,
  ReviewInstruction,
  ReviewInstructionSchema,
  WeeklyPlan,
  WeeklyPlanSchema
} from '../schemas';
import { logger } from '../logger';

interface ReviewContext {
  profile: GenerateWeekInput['profile'];
  avoidList: string[];
}

const dietAvoidMap: Record<
  GenerateWeekInput['profile']['dietType'],
  string[]
> = {
  none: [],
  halal: ['pork', 'bacon', 'ham', 'alcohol'],
  vegan: ['meat', 'chicken', 'fish', 'egg', 'yogurt', 'cheese'],
  vegetarian: ['pork', 'bacon'],
  keto: ['sugar', 'white rice', 'bread'],
  gluten_free: ['wheat', 'barley'],
  lactose_free: ['milk', 'cheese', 'yogurt']
};

const parseIngredientMention = (feedback: string): string | undefined => {
  const match = feedback.match(/(?:remove|avoid|no)\s+([a-zA-Z\s]+)/i);
  return match ? match[1].trim().toLowerCase() : undefined;
};

const parseSwapMention = (feedback: string) => {
  const match = feedback.match(/swap\s+([a-zA-Z\s]+)\s+(?:for|with)\s+([a-zA-Z\s]+)/i);
  if (!match) return undefined;
  return {
    remove: match[1].trim().toLowerCase(),
    add: match[2].trim().toLowerCase()
  };
};

export const reviewAgent = {
  buildAvoidList(input: GenerateWeekInput): string[] {
    const dietAvoids = dietAvoidMap[input.profile.dietType] ?? [];
    const avoidList = Array.from(
      new Set([
        ...dietAvoids,
        ...input.preferences.ingredientsAvoid.map((item) => item.toLowerCase())
      ])
    );
    reviewLog.debug(
      { action: 'build-avoid-list', dietType: input.profile.dietType, size: avoidList.length },
      'Compiled avoid list'
    );
    return avoidList;
  },
  interpretFeedback(feedback: string): ReviewInstruction {
    const normalized = feedback.toLowerCase();
    const swap = parseSwapMention(normalized);
    const ingredient = parseIngredientMention(normalized);

    if (swap) {
      const instruction = ReviewInstructionSchema.parse({
        targetLevel: 'ingredient',
        action: 'swap_ingredient',
        params: {
          ingredientToRemove: swap.remove,
          ingredientToAdd: swap.add,
          applyToWholeWeek: normalized.includes('week')
        }
      });
      reviewLog.info(
        {
          action: 'interpret-feedback',
          type: 'swap',
          remove: swap.remove,
          add: swap.add
        },
        'Interpreted swap feedback'
      );
      return instruction;
    }

    if (ingredient) {
      const instruction = ReviewInstructionSchema.parse({
        targetLevel: 'ingredient',
        action: 'remove_ingredient',
        params: {
          ingredientToRemove: ingredient,
          applyToWholeWeek: normalized.includes('week')
        }
      });
      reviewLog.info(
        { action: 'interpret-feedback', type: 'remove', ingredient },
        'Interpreted removal feedback'
      );
      return instruction;
    }

    if (normalized.includes('day')) {
      const instruction = ReviewInstructionSchema.parse({
        targetLevel: 'day',
        action: 'regenerate_day',
        params: {
          makeCheaper: normalized.includes('cheap'),
          makeHealthier: normalized.includes('health'),
          makeHigherProtein: normalized.includes('protein')
        }
      });
      reviewLog.info({ action: 'interpret-feedback', type: 'day' }, 'Regenerate day instruction');
      return instruction;
    }

    if (normalized.includes('meal')) {
      const instruction = ReviewInstructionSchema.parse({
        targetLevel: 'meal',
        action: 'regenerate_meal',
        params: {
          makeCheaper: normalized.includes('cheap'),
          makeHealthier: normalized.includes('health'),
          makeHigherProtein: normalized.includes('protein'),
          preferMealType: normalized.includes('smoothie') ? 'drinkable' : undefined
        }
      });
      reviewLog.info({ action: 'interpret-feedback', type: 'meal' }, 'Regenerate meal instruction');
      return instruction;
    }

    const instruction = ReviewInstructionSchema.parse({
      targetLevel: 'week',
      action: normalized.includes('new') ? 'generate_new_week' : 'regenerate_week',
      params: {
        makeCheaper: normalized.includes('cheap'),
        makeHealthier: normalized.includes('health'),
        makeHigherProtein: normalized.includes('protein'),
        easierDifficulty: normalized.includes('easy')
      }
    });
    reviewLog.info({ action: 'interpret-feedback', type: 'week' }, 'Week-level instruction');
    return instruction;
  },
  validatePlan(plan: WeeklyPlan, context: ReviewContext) {
    const issues: string[] = [];
    const parsed = WeeklyPlanSchema.safeParse(plan);
    if (!parsed.success) {
      parsed.error.issues.forEach((issue) => {
        issues.push(`${issue.path.join('.')}: ${issue.message}`);
      });
      return { valid: false, issues };
    }

    let computedCost = 0;
    const avoidSet = new Set(context.avoidList.map((item) => item.toLowerCase()));

    plan.days.forEach((day) => {
      day.meals.forEach((meal) => {
        computedCost += meal.estimatedCost ?? 0;
        meal.ingredients.forEach((ingredient) => {
          if (avoidSet.has(ingredient.name.toLowerCase())) {
            const message = `Ingredient ${ingredient.name} violates avoid list`;
            issues.push(message);
            reviewLog.warn(
              { action: 'validate-plan', issue: message, ingredient: ingredient.name },
              'Dietary violation'
            );
          }
        });
      });
    });

    if (context.profile.weeklyBudgetGbp) {
      const maxBudget = context.profile.weeklyBudgetGbp;
      if (computedCost > maxBudget * 1.05) {
        issues.push(
          `Plan cost £${computedCost.toFixed(2)} exceeds budget £${maxBudget.toFixed(2)}`
        );
        reviewLog.warn(
          {
            action: 'validate-plan',
            computedCost: computedCost.toFixed(2),
            maxBudget: maxBudget.toFixed(2)
          },
          'Budget exceeded'
        );
      }
    }

    if (issues.length === 0) {
      reviewLog.info({ action: 'validate-plan' }, 'Plan passed validation');
    }
    return { valid: issues.length === 0, issues };
  }
};
const reviewLog = logger.child({ scope: 'review-agent' });
