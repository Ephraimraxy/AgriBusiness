import { useQuery } from "@tanstack/react-query";
import { getResourcePersonRegistrations } from "@/lib/adminResortFirebaseService";

export const useResourcePersons = () => {
  return useQuery({
    queryKey: ["resource-persons"],
    queryFn: getResourcePersonRegistrations,
    staleTime: 0, // Always fetch fresh data
    refetchInterval: 30000, // Refetch every 30 seconds for live updates
    refetchIntervalInBackground: true, // Continue refetching even when tab is not active
    refetchOnWindowFocus: true, // Refetch when user returns to the tab
  });
};
