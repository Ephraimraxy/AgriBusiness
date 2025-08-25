import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect } from "react";

export default function OriginalMain() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (user) {
      if (user.role === "staff") {
        setLocation("/original/dashboard");
      } else {
        setLocation("/original/home");
      }
    } else {
      setLocation("/original/login");
    }
  }, [user, setLocation]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[hsl(var(--primary))] mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting to Original App...</p>
      </div>
    </div>
  );
} 