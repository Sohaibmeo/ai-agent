import { apiClient } from './client';
import type { WeeklyPlan } from './types';

export function fetchActivePlan() {
  return apiClient.get<WeeklyPlan | null>('/plans/active');
}

export function fetchPlansList() {
  return apiClient.get<WeeklyPlan[]>('/plans');
}

export function generatePlan(payload: {
  weekStartDate?: string;
  useAgent?: boolean;
  useLlmRecipes?: boolean;
  sameMealsAllWeek?: boolean;
  weeklyBudgetGbp?: number;
  breakfast_enabled?: boolean;
  snack_enabled?: boolean;
  lunch_enabled?: boolean;
  dinner_enabled?: boolean;
  maxDifficulty?: string;
}) {
  return apiClient.post<WeeklyPlan>('/plans/generate', payload);
}

export function applyPlanAction(weeklyPlanId: string, body: any) {
  return apiClient.post<WeeklyPlan>(`/plans/${weeklyPlanId}/actions`, body);
}

export function setMealRecipe(body: { planMealId: string; newRecipeId: string }) {
  return apiClient.post<WeeklyPlan>('/plans/set-meal-recipe', body);
}

export function activatePlan(planId: string) {
  return apiClient.post<WeeklyPlan>('/plans/activate', { planId });
}

export function setPlanStatus(planId: string, status: 'systemdraft' | 'draft' | 'active' | 'archived') {
  return apiClient.post<WeeklyPlan>('/plans/status', { planId, status });
}

export function saveCustomRecipe(payload: {
  planMealId: string;
  newName: string;
  ingredientItems: { ingredientId: string; quantity: number; unit: string }[];
  instructions?: string;
}) {
  return apiClient.post('/plans/save-custom-recipe', payload);
}

export function aiPlanSwap(payload: any) {
  return apiClient.post('/plans/ai-plan-swap', payload);
}
