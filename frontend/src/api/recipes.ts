import { apiClient } from './client';

export interface RecipeCandidate {
  id: string;
  name: string;
  meal_slot: string;
}

export function fetchRecipeCandidates(params: { userId: string; mealSlot?: string }) {
  const search = new URLSearchParams();
  search.set('userId', params.userId);
  if (params.mealSlot) search.set('mealSlot', params.mealSlot);
  return apiClient.get<RecipeCandidate[]>(`/recipes/candidates?${search.toString()}`);
}
