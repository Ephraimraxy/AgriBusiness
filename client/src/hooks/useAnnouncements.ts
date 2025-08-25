import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import type { Announcement } from "@shared/schema";

/**
 * Fetch active announcements.  Optionally filtered by sponsorId.
 */
export function useAnnouncements(
  sponsorId?: string,
  options: Partial<UseQueryOptions<Announcement[], Error>> = {}
) {
  return useQuery<Announcement[], Error>({
    queryKey: ["/api/announcements", sponsorId ?? "all"],
    queryFn: async () => {
      const url = sponsorId ? `/api/announcements?sponsorId=${sponsorId}` : "/api/announcements";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch announcements");
      return res.json();
    },
    staleTime: 60 * 1000, // 1 minute
    ...options,
  });
}
