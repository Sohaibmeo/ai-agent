import { useQuery } from '@tanstack/react-query';
import { fetchActiveShoppingList, fetchShoppingList } from '../api/shoppingList';
import type { ShoppingList } from '../api/types';
import { useAuth } from '../context/AuthContext';

export function useShoppingList(planId?: string, userIdArg?: string) {
  const { user } = useAuth();
  const userId = userIdArg || user?.id;
  return useQuery<ShoppingList>({
    queryKey: ['shopping-list', planId ? planId : 'active', userId],
    queryFn: () => (planId ? fetchShoppingList(planId, userId as string) : fetchActiveShoppingList(userId as string)),
    enabled: Boolean(userId),
  });
}
