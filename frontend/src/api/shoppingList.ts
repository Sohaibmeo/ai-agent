import { apiClient } from './client';
import type { ShoppingList, UpdatePantryPayload, UpdatePricePayload } from './types';

export function fetchActiveShoppingList(userId: string) {
  return apiClient.get<ShoppingList>(`/shopping-list/active/${userId}`);
}

export function fetchShoppingList(planId: string, userId: string) {
  return apiClient.get<ShoppingList>(`/shopping-list/${planId}?userId=${userId}`);
}

export function updatePantry(payload: UpdatePantryPayload) {
  return apiClient.post<ShoppingList>('/shopping-list/pantry', payload);
}

export function updatePrice(payload: UpdatePricePayload) {
  return apiClient.post<ShoppingList>('/shopping-list/price', payload);
}

export function emailShoppingList(payload: { planId: string }) {
  return apiClient.post<{ ok: boolean }>('/shopping-list/email', payload);
}
