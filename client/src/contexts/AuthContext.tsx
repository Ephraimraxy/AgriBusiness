import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { onAuthStateChange } from '@/lib/firebaseAuth';
import { getUserByEmail } from '@/lib/firebaseService';

export interface AuthUser extends User {
  role?: string;
  firstName?: string;
  surname?: string;
  middleName?: string;
  phone?: string;
  isVerified?: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChange(async (firebaseUser) => {
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
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    user,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};