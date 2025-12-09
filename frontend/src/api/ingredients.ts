import { apiClient } from './client';
import type { Ingredient } from './types';

export function fetchIngredients() {
  return apiClient.get<Ingredient[]>('/ingredients');
}

export interface ResolveIngredientResult {
  matches: { ingredient: Ingredient; score: number }[];
  resolved: Ingredient | null;
}

export function resolveIngredient(payload: { query: string; limit?: number; createIfMissing?: boolean }) {
  return apiClient.post<ResolveIngredientResult>('/ingredients/resolve', payload);
}
