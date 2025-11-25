import { apiClient } from './client';
import type { UserProfile } from './types';

export function fetchProfile(userId: string) {
  return apiClient.get<UserProfile>(`/users/${userId}/profile`);
}

export function updateProfile(userId: string, payload: Partial<UserProfile>) {
  return apiClient.put<UserProfile>(`/users/${userId}/profile`, payload);
}
