import React, { useEffect } from "react";
import { useLocation } from "wouter";
import { signOutUser } from "@/lib/firebaseAuth";
import CSSFarmsLoader from "@/components/ui/css-farms-loader";

export default function AdminLogout() {
  const [, navigate] = useLocation();

  useEffect(() => {
    const handleLogout = async () => {
      try {
        console.log("Starting admin logout process...");
        
        // Clear localStorage first
        localStorage.removeItem('adminAuthenticated');
        localStorage.removeItem('adminEmail');
        localStorage.removeItem('adminUser');
        console.log("LocalStorage cleared");
        
        // Sign out from Firebase
        await signOutUser();
        console.log("Firebase signout successful");
        
        // Small delay to ensure cleanup is complete
        await new Promise(resolve => setTimeout(resolve, 500));
        
        console.log("Admin logout successful, redirecting...");
        
        // Redirect to admin login
        navigate("/admin-login");
      } catch (error) {
        console.error("Logout error:", error);
        // Even if there's an error, clear localStorage and redirect
        localStorage.removeItem('adminAuthenticated');
        localStorage.removeItem('adminEmail');
        localStorage.removeItem('adminUser');
        
        // Small delay before redirect
        setTimeout(() => {
          navigate("/admin-login");
        }, 500);
      }
    };

    // Small delay before starting logout process
    const timer = setTimeout(handleLogout, 100);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <CSSFarmsLoader size="lg" />
        <p className="text-gray-600 mt-4">Logging out...</p>
      </div>
    </div>
  );
}
