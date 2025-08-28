import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import type { Content } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

/**
 * Fetch training content items (videos, quizzes, assignments).
 * Can be filtered by sponsorId if supplied.
 */
export function useContent(
  sponsorId?: string,
  options: Partial<UseQueryOptions<Content[], Error>> = {}
) {
  return useQuery<Content[], Error>({
    queryKey: ["/api/content", sponsorId ?? "all"],
    queryFn: async () => {
      const url = sponsorId ? `/api/content?sponsorId=${sponsorId}` : "/api/content";
      const res = await apiRequest("GET", url);
      if (!res.ok) throw new Error("Failed to fetch content");
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
}
