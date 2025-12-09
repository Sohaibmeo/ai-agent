import { useQuery } from '@tanstack/react-query';
import { fetchRecipeCandidates } from '../api/recipes';
import type { RecipeCandidate } from '../api/recipes';
import { useAuth } from '../context/AuthContext';

export function useRecipeCandidates(mealSlot?: string, search?: string) {
  const { user } = useAuth();
  const userId = user?.id;
  const trimmedSearch = search?.trim() || undefined;
  return useQuery<RecipeCandidate[]>({
    queryKey: ['recipe-candidates', userId, mealSlot, trimmedSearch],
    queryFn: () => fetchRecipeCandidates({ mealSlot, search: trimmedSearch }),
    enabled: Boolean(mealSlot) && Boolean(userId),
  });
}
