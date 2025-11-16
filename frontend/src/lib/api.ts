import { API_BASE_URL } from "./utils";
import type { PlanRecord, UserProfilePayload, WeeklyPlanResponse } from "../types";

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...(options?.headers || {}) },
    ...options,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed: ${response.status}`);
  }

  return response.json();
}

export const createOrUpdateUser = (payload: UserProfilePayload) =>
  apiFetch<UserProfilePayload & { id: string }>("/api/users", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const requestPlanGeneration = (userId: string) =>
  apiFetch<WeeklyPlanResponse>("/api/plans/generate", {
    method: "POST",
    body: JSON.stringify({ userId }),
  });

export const fetchPlans = (userId: string) => apiFetch<PlanRecord[]>(`/api/plans/${userId}`);
