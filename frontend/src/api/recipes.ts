import { apiClient } from './client';
import type { RecipeWithIngredients } from './types';

export interface RecipeCandidate {
  id: string;
  name: string;
  meal_slot: string;
  meal_type?: string;
  base_kcal?: number | null;
  base_cost_gbp?: number | null;
  base_protein?: number | null;
  base_carbs?: number | null;
  base_fat?: number | null;
}

export function fetchRecipeCandidates(params: { userId: string; mealSlot?: string }) {
  const search = new URLSearchParams();
  search.set('userId', params.userId);
  if (params.mealSlot) search.set('mealSlot', params.mealSlot);
  return apiClient.get<RecipeCandidate[]>(`/recipes/candidates?${search.toString()}`);
}

export function fetchRecipeById(id: string) {
  return apiClient.get<RecipeWithIngredients>(`/recipes/${id}`);
}
