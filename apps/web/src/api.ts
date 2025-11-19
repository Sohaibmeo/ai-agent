import {
  PlannerResponse,
  ReviewInstruction,
  ShoppingList,
  UserPreferences,
  UserProfile,
  UserState
} from './types';

const API_BASE =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? 'http://localhost:4000';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers ?? {})
    },
    ...options
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Request failed');
  }
  return response.json() as Promise<T>;
}

export const api = {
  fetchUser(userId: string) {
    return request<{ user: UserState; latestPlan?: PlannerResponse['plan']; shoppingList?: ShoppingList }>(
      `/api/users/${userId}`
    );
  },
  saveProfile(userId: string, profile: UserProfile) {
    return request<UserProfile>(`/api/users/${userId}/profile`, {
      method: 'PUT',
      body: JSON.stringify(profile)
    });
  },
  savePreferences(userId: string, preferences: UserPreferences) {
    return request<UserPreferences>(`/api/users/${userId}/preferences`, {
      method: 'PUT',
      body: JSON.stringify(preferences)
    });
  },
  generateWeek(userId: string) {
    return request<PlannerResponse>('/api/plan/generate-week', {
      method: 'POST',
      body: JSON.stringify({ userId })
    });
  },
  applyInstruction(userId: string, instruction: ReviewInstruction) {
    return request<PlannerResponse>('/api/plan/apply-instruction', {
      method: 'POST',
      body: JSON.stringify({ userId, instruction })
    });
  },
  interpretFeedback(feedback: string) {
    return request<ReviewInstruction>('/api/review/interpret', {
      method: 'POST',
      body: JSON.stringify({ feedback })
    });
  },
  fetchShoppingList(planId: string) {
    return request<ShoppingList>(`/api/plan/${planId}/shopping-list`);
  }
};
