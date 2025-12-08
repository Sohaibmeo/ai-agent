import { useQuery } from '@tanstack/react-query';
import { DEMO_USER_ID } from '../lib/config';
import { fetchRecipeCandidates } from '../api/recipes';
import type { RecipeCandidate } from '../api/recipes';

export function useRecipeCandidates(mealSlot?: string, userId: string = DEMO_USER_ID, search?: string) {
  const trimmedSearch = search?.trim() || undefined;
  return useQuery<RecipeCandidate[]>({
    queryKey: ['recipe-candidates', userId, mealSlot, trimmedSearch],
    queryFn: () => fetchRecipeCandidates({ userId, mealSlot, search: trimmedSearch }),
    enabled: Boolean(mealSlot),
  });
}
