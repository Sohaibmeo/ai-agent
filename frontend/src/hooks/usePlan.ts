import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DEMO_USER_ID } from '../lib/config';
import { applyPlanAction, fetchActivePlan, generatePlan } from '../api/plans';
import type { WeeklyPlan } from '../api/types';

export function useActivePlan(userId: string = DEMO_USER_ID) {
  const queryClient = useQueryClient();

  const planQuery = useQuery<WeeklyPlan>({
    queryKey: ['plan', 'active', userId],
    queryFn: () => fetchActivePlan(userId),
  });

  const generateMutation = useMutation({
    mutationFn: (opts: { useAgent?: boolean }) =>
      generatePlan({ userId, weekStartDate: new Date().toISOString().slice(0, 10), ...opts }),
    onSuccess: (data) => {
      queryClient.setQueryData(['plan', 'active', userId], data);
    },
  });

  const actionMutation = useMutation({
    mutationFn: (body: any) => {
      const planId = (planQuery.data?.id as string) || '';
      return applyPlanAction(planId, { userId, ...body });
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['plan', 'active', userId], data);
    },
  });

  return {
    ...planQuery,
    generatePlan: generateMutation.mutateAsync,
    isGenerating: generateMutation.isPending,
    applyAction: actionMutation.mutateAsync,
    isApplying: actionMutation.isPending,
    refetchPlan: planQuery.refetch,
  };
}
