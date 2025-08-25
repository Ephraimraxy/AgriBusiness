import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getMessages, markMessageAsRead } from "@/lib/firebaseService";

export const useMessages = (userId: string) => {
  return useQuery({
    queryKey: ["messages", userId],
    queryFn: () => getMessages(userId),
    enabled: !!userId,
    staleTime: 0, // Always fetch fresh data
    refetchInterval: 30000, // Refetch every 30 seconds
    refetchIntervalInBackground: true,
  });
};

export const useMarkMessageAsRead = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: markMessageAsRead,
    onSuccess: (_, messageId) => {
      // Invalidate messages query to refresh the list
      queryClient.invalidateQueries({ queryKey: ["messages"] });
    },
  });
};
