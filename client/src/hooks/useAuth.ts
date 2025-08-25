
import { useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getUserByEmail, BaseUser } from "@/lib/firebaseService";

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
          // Fetch user data from Firestore
          const userData = await getUserByEmail(firebaseUser.email || "");
          if (userData) {
            // Combine Firebase Auth user with Firestore user data
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
            // If no Firestore data found, use Firebase Auth user only
            setUser(firebaseUser as AuthUser);
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          // Fallback to Firebase Auth user only
          setUser(firebaseUser as AuthUser);
        }
      } else {
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
