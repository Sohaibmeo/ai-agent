import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchProfileMe, updateProfileMe } from '../api/profile';
import type { UserProfile } from '../api/types';
import { useAuth } from '../context/AuthContext';

export function useProfile() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const profileQuery = useQuery<UserProfile>({
    queryKey: ['profile', 'me'],
    enabled: Boolean(token),
    queryFn: () => fetchProfileMe(token as string),
  });

  const mutation = useMutation({
    mutationFn: (payload: Partial<UserProfile>) => updateProfileMe(token as string, payload),
    onSuccess: (data) => {
      queryClient.setQueryData(['profile', 'me'], data);
    },
  });

  return {
    ...profileQuery,
    saveProfile: mutation.mutateAsync,
    isSaving: mutation.isPending,
  };
}
