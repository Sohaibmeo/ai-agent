import { useQuery } from '@tanstack/react-query';
import { DEMO_USER_ID } from '../lib/config';
import { fetchActiveShoppingList, fetchShoppingList } from '../api/shoppingList';
import type { ShoppingList } from '../api/types';

export function useShoppingList(planId?: string, userId: string = DEMO_USER_ID) {
  return useQuery<ShoppingList>({
    queryKey: ['shopping-list', planId ? planId : 'active', userId],
    queryFn: () => (planId ? fetchShoppingList(planId, userId) : fetchActiveShoppingList(userId)),
    enabled: planId ? true : Boolean(userId),
  });
}
