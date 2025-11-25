import { useQuery } from '@tanstack/react-query';
import { DEMO_USER_ID } from '../lib/config';
import { fetchRecipeCandidates } from '../api/recipes';
import type { RecipeCandidate } from '../api/recipes';

export function useRecipeCandidates(mealSlot?: string, userId: string = DEMO_USER_ID) {
  return useQuery<RecipeCandidate[]>({
    queryKey: ['recipe-candidates', userId, mealSlot],
    queryFn: () => fetchRecipeCandidates({ userId, mealSlot }),
    enabled: Boolean(mealSlot),
  });
}
