import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import type { Trainee } from '@shared/schema';

export function useTrainees() {
  return useQuery({
    queryKey: ['trainees'],
    queryFn: async (): Promise<Trainee[]> => {
      return apiRequest('GET', '/api/trainees');
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}

export function useTraineeById(traineeId: string) {
  return useQuery({
    queryKey: ['trainee', traineeId],
    queryFn: async (): Promise<Trainee> => {
      return apiRequest('GET', `/api/trainees/${traineeId}`);
    },
    enabled: !!traineeId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}
