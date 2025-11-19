import { Ingredient, UserState } from '../data/store';

export interface PriceAgentContext {
  user: UserState;
  ingredientCatalog: Ingredient[];
}

const defaultFallbackPrice = 0.75;

export const priceAgent = {
  resolveIngredient(ingredientCatalog: Ingredient[], ingredientId: string) {
    return ingredientCatalog.find((ing) => ing.id === ingredientId);
  },
  getUnitPrice(context: PriceAgentContext, ingredientId: string): number {
    const override = context.user.ingredientOverrides[ingredientId];
    if (override) {
      return override;
    }
    const ingredient = this.resolveIngredient(context.ingredientCatalog, ingredientId);
    if (ingredient) {
      return ingredient.estimatedPricePerUnit;
    }
    return defaultFallbackPrice;
  },
  estimateIngredientCost(
    context: PriceAgentContext,
    ingredientId: string,
    quantity: number
  ): number {
    const unitPrice = this.getUnitPrice(context, ingredientId);
    return Number((unitPrice * quantity).toFixed(2));
  }
};
