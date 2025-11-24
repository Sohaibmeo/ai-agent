import { apiClient } from './client';
import type { WeeklyPlan } from './types';

export function fetchActivePlan(userId: string) {
  return apiClient.get<WeeklyPlan>(`/plans/active/${userId}`);
}

export function fetchPlansList() {
  return apiClient.get<WeeklyPlan[]>('/plans');
}

export function generatePlan(payload: { userId: string; weekStartDate?: string; useAgent?: boolean }) {
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
