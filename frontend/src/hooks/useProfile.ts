import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DEMO_USER_ID } from '../lib/config';
import { fetchProfile, updateProfile } from '../api/profile';
import type { UserProfile } from '../api/types';

export function useProfile(userId: string = DEMO_USER_ID) {
  const queryClient = useQueryClient();

  const profileQuery = useQuery<UserProfile>({
    queryKey: ['profile', userId],
    queryFn: () => fetchProfile(userId),
  });

  const mutation = useMutation({
    mutationFn: (payload: Partial<UserProfile>) => updateProfile(userId, payload),
    onSuccess: (data) => {
      queryClient.setQueryData(['profile', userId], data);
    },
  });

  return {
    ...profileQuery,
    saveProfile: mutation.mutateAsync,
    isSaving: mutation.isPending,
  };
}
