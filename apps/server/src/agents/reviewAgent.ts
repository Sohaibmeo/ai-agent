import {
  GenerateWeekInput,
  ReviewInstruction,
  ReviewInstructionSchema,
  WeeklyPlan,
  WeeklyPlanSchema
} from '../schemas';

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
    return Array.from(
      new Set([
        ...dietAvoids,
        ...input.preferences.ingredientsAvoid.map((item) => item.toLowerCase())
      ])
    );
  },
  interpretFeedback(feedback: string): ReviewInstruction {
    const normalized = feedback.toLowerCase();
    const swap = parseSwapMention(normalized);
    const ingredient = parseIngredientMention(normalized);

    if (swap) {
      return ReviewInstructionSchema.parse({
        targetLevel: 'ingredient',
        action: 'swap_ingredient',
        params: {
          ingredientToRemove: swap.remove,
          ingredientToAdd: swap.add,
          applyToWholeWeek: normalized.includes('week')
        }
      });
    }

    if (ingredient) {
      return ReviewInstructionSchema.parse({
        targetLevel: 'ingredient',
        action: 'remove_ingredient',
        params: {
          ingredientToRemove: ingredient,
          applyToWholeWeek: normalized.includes('week')
        }
      });
    }

    if (normalized.includes('day')) {
      return ReviewInstructionSchema.parse({
        targetLevel: 'day',
        action: 'regenerate_day',
        params: {
          makeCheaper: normalized.includes('cheap'),
          makeHealthier: normalized.includes('health'),
          makeHigherProtein: normalized.includes('protein')
        }
      });
    }

    if (normalized.includes('meal')) {
      return ReviewInstructionSchema.parse({
        targetLevel: 'meal',
        action: 'regenerate_meal',
        params: {
          makeCheaper: normalized.includes('cheap'),
          makeHealthier: normalized.includes('health'),
          makeHigherProtein: normalized.includes('protein'),
          preferMealType: normalized.includes('smoothie') ? 'drinkable' : undefined
        }
      });
    }

    return ReviewInstructionSchema.parse({
      targetLevel: 'week',
      action: normalized.includes('new') ? 'generate_new_week' : 'regenerate_week',
      params: {
        makeCheaper: normalized.includes('cheap'),
        makeHealthier: normalized.includes('health'),
        makeHigherProtein: normalized.includes('protein'),
        easierDifficulty: normalized.includes('easy')
      }
    });
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
            issues.push(`Ingredient ${ingredient.name} violates avoid list`);
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
      }
    }

    return { valid: issues.length === 0, issues };
  }
};
