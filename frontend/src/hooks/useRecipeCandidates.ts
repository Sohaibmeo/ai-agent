import { useQuery } from '@tanstack/react-query';
import { fetchRecipeCandidates } from '../api/recipes';
import type { RecipeCandidate } from '../api/recipes';
import { useAuth } from '../context/AuthContext';

export function useRecipeCandidates(mealSlot?: string, userIdArg?: string, search?: string) {
  const { user } = useAuth();
  const userId = userIdArg || user?.id;
  const trimmedSearch = search?.trim() || undefined;
  return useQuery<RecipeCandidate[]>({
    queryKey: ['recipe-candidates', userId, mealSlot, trimmedSearch],
    queryFn: () => fetchRecipeCandidates({ userId: userId as string, mealSlot, search: trimmedSearch }),
    enabled: Boolean(mealSlot) && Boolean(userId),
  });
}
