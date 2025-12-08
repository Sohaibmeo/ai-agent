import { API_BASE_URL } from '../lib/config';
import { apiClient } from './client';
import type { WeeklyPlan } from './types';

export async function fetchActivePlan(userId: string) {
  const res = await fetch(`${API_BASE_URL}/plans/active/${userId}`, {
    headers: { 'Content-Type': 'application/json' },
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return (await res.json()) as WeeklyPlan;
}

export function fetchPlansList() {
  return apiClient.get<WeeklyPlan[]>('/plans');
}

export function generatePlan(payload: {
  userId: string;
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
