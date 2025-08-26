import React, { useEffect } from "react";
import { useLocation } from "wouter";
import { signOutUser } from "@/lib/firebaseAuth";
import CSSFarmsLoader from "@/components/ui/css-farms-loader";

export default function AdminLogout() {
  const [, navigate] = useLocation();

  useEffect(() => {
    const handleLogout = async () => {
      try {
        // Clear localStorage
        localStorage.removeItem('adminAuthenticated');
        localStorage.removeItem('adminEmail');
        localStorage.removeItem('adminUser');
        
        // Sign out from Firebase
        await signOutUser();
        
        console.log("Admin logout successful");
        
        // Redirect to admin login
        navigate("/admin-login");
      } catch (error) {
        console.error("Logout error:", error);
        // Even if there's an error, clear localStorage and redirect
        localStorage.removeItem('adminAuthenticated');
        localStorage.removeItem('adminEmail');
        localStorage.removeItem('adminUser');
        navigate("/admin-login");
      }
    };

    handleLogout();
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
