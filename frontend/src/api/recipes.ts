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

export function fetchRecipeCandidates(params: { userId: string; mealSlot?: string; search?: string }) {
  const search = new URLSearchParams();
  search.set('userId', params.userId);
  if (params.mealSlot) search.set('mealSlot', params.mealSlot);
  if (params.search) search.set('search', params.search);
  return apiClient.get<RecipeCandidate[]>(`/recipes/candidates?${search.toString()}`);
}

export function fetchRecipeById(id: string) {
  return apiClient.get<RecipeWithIngredients>(`/recipes/${id}`);
}

export function fetchRecipes(params: { userId?: string; search?: string }) {
  const searchParams = new URLSearchParams();
  if (params.userId) searchParams.set('userId', params.userId);
  if (params.search) searchParams.set('search', params.search);
  const qs = searchParams.toString();
  return apiClient.get<Recipe[]>(`/recipes${qs ? `?${qs}` : ''}`);
}

export function createRecipe(payload: {
  userId?: string;
  name: string;
  instructions?: string;
  ingredients: { ingredient_name?: string; ingredientId?: string; quantity: number; unit?: string }[];
  mealSlot?: string;
  difficulty?: string;
  imageUrl?: string | null;
}) {
  const searchParams = new URLSearchParams();
  if (payload.userId) searchParams.set('userId', payload.userId);
  const body = { ...payload };
  return apiClient.post<RecipeWithIngredients>(`/recipes${searchParams.size ? `?${searchParams.toString()}` : ''}`, body);
}

export function updateRecipe(id: string, payload: {
  userId?: string;
  name?: string;
  instructions?: string;
  ingredients?: { ingredient_name?: string; ingredientId?: string; quantity?: number; unit?: string }[];
  mealSlot?: string;
  difficulty?: string;
}) {
  const searchParams = new URLSearchParams();
  if (payload.userId) searchParams.set('userId', payload.userId);
  const qs = searchParams.size ? `?${searchParams.toString()}` : '';
  return apiClient.patch<RecipeWithIngredients>(`/recipes/${id}${qs}`, payload);
}

export function adjustRecipeAi(id: string, payload: { userId?: string; note?: string }) {
  return apiClient.post<RecipeWithIngredients>(`/recipes/${id}/ai-adjust`, payload);
}

export function generateRecipeAi(payload: { userId?: string; note?: string; mealSlot?: string; mealType?: string }) {
  return apiClient.post<RecipeWithIngredients>(`/recipes/ai-generate`, payload);
}

export function generateRecipeFromImage(payload: {
  userId?: string;
  imageBase64: string;
  note?: string;
  mealSlot?: string;
  mealType?: string;
}) {
  return apiClient.post<RecipeWithIngredients>(`/recipes/ai-generate-from-image`, payload);
}
