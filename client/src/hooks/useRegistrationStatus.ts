import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export function useRegistrationStatus() {
  return useQuery<{ key: string; value: string } | null, Error>({
    queryKey: ["/api/settings", "registration_enabled"],
    queryFn: async () => {
      const res = await fetch("/api/settings/registration_enabled");
      if (res.status === 404) return null; // Not set yet
      if (!res.ok) throw new Error("Failed to fetch setting");
      return res.json();
    },
    staleTime: 30 * 1000,
  });
}

export function useToggleRegistration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (open: boolean) => {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "registration_enabled", value: open ? "true" : "false" }),
      });
      if (!res.ok) throw new Error("Failed to update setting");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/settings", "registration_enabled"] });
    },
  });
}
