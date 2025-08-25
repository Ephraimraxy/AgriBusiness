import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendEmailVerification,
  sendPasswordResetEmail,
  User
} from "firebase/auth";
import { auth } from "./firebase";
import VerificationService from "./verification";

export interface AuthUser extends User {
  displayName: string | null;
  email: string | null;
  uid: string;
}

// Sign up with email and password
export const signUpWithEmail = async (email: string, password: string, displayName: string) => {
  try {
    return await VerificationService.createUserWithEmailPassword(email, password, displayName);
  } catch (error: any) {
    throw new Error(error.message);
  }
};

// Sign in with email and password
export const signInWithEmail = async (email: string, password: string) => {
  try {
    return await VerificationService.signInWithEmailPassword(email, password);
  } catch (error: any) {
    throw new Error(error.message);
  }
};

// Send verification code for registration/login
export const sendVerificationCode = async (identifier: string, method: 'email' | 'phone') => {
  try {
    if (method === 'email') {
      return await VerificationService.sendEmailVerification(identifier);
    } else {
      return await VerificationService.sendSMSVerification(identifier);
    }
  } catch (error: any) {
    throw new Error(error.message);
  }
};

// Verify code
export const verifyCode = (identifier: string, code: string) => {
  return VerificationService.verifyCode(identifier, code);
};

// Login with verification code (alternative to password)
export const loginWithVerification = async (identifier: string, code: string) => {
  return await VerificationService.loginWithVerificationCode(identifier, code);
};

// Reset password
export const resetPassword = async (email: string): Promise<void> => {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error: any) {
    throw new Error(error.message);
  }
};

// Sign out
export const signOutUser = async () => {
  await signOut(auth);
};

// Get current user
export const getCurrentUser = (): Promise<User | null> => {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
};

// Auth state listener
export const onAuthStateChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};