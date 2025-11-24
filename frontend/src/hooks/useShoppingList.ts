import { useQuery } from '@tanstack/react-query';
import { DEMO_USER_ID } from '../lib/config';
import { fetchActiveShoppingList } from '../api/shoppingList';
import type { ShoppingList } from '../api/types';

export function useActiveShoppingList(userId: string = DEMO_USER_ID) {
  return useQuery<ShoppingList>({
    queryKey: ['shopping-list', 'active', userId],
    queryFn: () => fetchActiveShoppingList(userId),
  });
}
