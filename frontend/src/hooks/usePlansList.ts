import { useQuery } from '@tanstack/react-query';
import { fetchPlansList } from '../api/plans';
import type { WeeklyPlan } from '../api/types';

export function usePlansList() {
  return useQuery<WeeklyPlan[]>({
    queryKey: ['plans', 'all'],
    queryFn: fetchPlansList,
  });
}
