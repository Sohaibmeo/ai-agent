import { apiClient } from './client';
import type { ShoppingList } from './types';

export function fetchActiveShoppingList(userId: string) {
  return apiClient.get<ShoppingList>(`/shopping-list/active/${userId}`);
}
