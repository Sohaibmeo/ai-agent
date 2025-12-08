import { apiClient } from './client';
import type { RecipeWithIngredients, Recipe } from './types';

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

export function fetchRecipeCandidates(params: { mealSlot?: string; search?: string }) {
  const search = new URLSearchParams();
  if (params.mealSlot) search.set('mealSlot', params.mealSlot);
  if (params.search) search.set('search', params.search);
  const qs = search.toString();
  return apiClient.get<RecipeCandidate[]>(`/recipes/candidates${qs ? `?${qs}` : ''}`);
}

export function fetchRecipeById(id: string) {
  return apiClient.get<RecipeWithIngredients>(`/recipes/${id}`);
}

export function fetchRecipes(params: { search?: string } = {}) {
  const searchParams = new URLSearchParams();
  if (params.search) searchParams.set('search', params.search);
  const qs = searchParams.toString();
  return apiClient.get<Recipe[]>(`/recipes${qs ? `?${qs}` : ''}`);
}

export function createRecipe(payload: {
  name: string;
  instructions?: string;
  ingredients: { ingredient_name?: string; ingredientId?: string; quantity: number; unit?: string }[];
  mealSlot?: string;
  difficulty?: string;
  imageUrl?: string | null;
}) {
  return apiClient.post<RecipeWithIngredients>(`/recipes`, payload);
}

export function updateRecipe(id: string, payload: {
  name?: string;
  instructions?: string;
  ingredients?: { ingredient_name?: string; ingredientId?: string; quantity?: number; unit?: string }[];
  mealSlot?: string;
  difficulty?: string;
}) {
  return apiClient.patch<RecipeWithIngredients>(`/recipes/${id}`, payload);
}

export function adjustRecipeAi(id: string, payload: { note?: string }) {
  return apiClient.post<RecipeWithIngredients>(`/recipes/${id}/ai-adjust`, payload);
}

export function generateRecipeAi(payload: { note?: string; mealSlot?: string; mealType?: string }) {
  return apiClient.post<RecipeWithIngredients>(`/recipes/ai-generate`, payload);
}

export function generateRecipeFromImage(payload: {
  imageBase64: string;
  note?: string;
  mealSlot?: string;
  mealType?: string;
}) {
  return apiClient.post<RecipeWithIngredients>(`/recipes/ai-generate-from-image`, payload);
}
