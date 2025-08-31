
import { useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getUserByEmail, BaseUser } from "@/lib/apiService";

export interface AuthUser extends User {
  role?: string;
  firstName?: string;
  surname?: string;
  middleName?: string;
  phone?: string;
  isVerified?: boolean;
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          console.log('[AUTH DEBUG] Firebase user authenticated:', firebaseUser.email);
          // Fetch user data from API instead of Firestore
          const userData = await getUserByEmail(firebaseUser.email || "");
          if (userData) {
            console.log('[AUTH DEBUG] User data fetched from API:', userData);
            // Combine Firebase Auth user with API user data
            const extendedUser: AuthUser = {
              ...firebaseUser,
              role: userData.role,
              firstName: userData.firstName,
              surname: userData.surname,
              middleName: userData.middleName,
              phone: userData.phone,
              isVerified: userData.isVerified,
            };
            setUser(extendedUser);
          } else {
            console.log('[AUTH DEBUG] No user data found in API, using Firebase Auth user only');
            // If no API data found, use Firebase Auth user only
            setUser(firebaseUser as AuthUser);
          }
        } catch (error) {
          console.error("[AUTH ERROR] Error fetching user data from API:", error);
          // Fallback to Firebase Auth user only
          setUser(firebaseUser as AuthUser);
        }
      } else {
        console.log('[AUTH DEBUG] No Firebase user authenticated');
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
}
