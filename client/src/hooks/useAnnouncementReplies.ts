import { useQuery, useMutation, useQueryClient, UseQueryOptions } from "@tanstack/react-query";
import type { AnnouncementReply, InsertAnnouncementReply } from "@shared/schema";

/**
 * Fetch replies for a specific announcement
 */
export function useAnnouncementReplies(
  announcementId: string,
  options: Partial<UseQueryOptions<AnnouncementReply[], Error>> = {}
) {
  return useQuery<AnnouncementReply[], Error>({
    queryKey: ["/api/announcements", announcementId, "replies"],
    queryFn: async () => {
      try {
        const res = await fetch(`/api/announcements/${announcementId}/replies`);
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.message || `HTTP ${res.status}: Failed to fetch replies`);
        }
        return res.json();
      } catch (error) {
        console.error("Error in useAnnouncementReplies:", error);
        throw error;
      }
    },
    enabled: !!announcementId,
    staleTime: 30 * 1000, // 30 seconds
    retry: 1, // Only retry once
    ...options,
  });
}

/**
 * Create a new reply to an announcement
 */
export function useCreateAnnouncementReply() {
  const queryClient = useQueryClient();
  
  return useMutation<AnnouncementReply, Error, InsertAnnouncementReply>({
    mutationFn: async (replyData) => {
      const res = await fetch(`/api/announcements/${replyData.announcementId}/replies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: replyData.message }),
        credentials: 'include',
      });
      
      if (!res.ok) throw new Error("Failed to create reply");
      return res.json();
    },
    onSuccess: (reply, variables) => {
      // Invalidate and refetch replies for this announcement
      queryClient.invalidateQueries({ 
        queryKey: ["/api/announcements", variables.announcementId, "replies"] 
      });
    },
  });
}
