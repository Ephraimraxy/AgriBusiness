import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  sendEmailVerification,
  updateProfile,
  User
} from "firebase/auth";
import { auth } from "./firebase";

// Email verification service
export class VerificationService {
  private static verificationCodes = new Map<string, { code: string; expires: number; type: 'email' | 'phone' }>();

  // Generate a 6-digit verification code
  static generateVerificationCode(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  // Send email verification code
  static async sendEmailVerification(email: string): Promise<{ success: boolean; message: string; code?: string }> {
    try {
      const code = this.generateVerificationCode();
      const expires = Date.now() + 10 * 60 * 1000; // 10 minutes

      // Store the code temporarily
      this.verificationCodes.set(email, { code, expires, type: 'email' });

      // In a real app, you would send this via email service (SendGrid, AWS SES, etc.)
      // For demo purposes, we'll return the code
      console.log(`Verification code for ${email}: ${code}`);

      return {
        success: true,
        message: `Verification code sent to ${email}`,
        code: code // Remove this in production
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || "Failed to send verification code"
      };
    }
  }

  // Send SMS verification code
  static async sendSMSVerification(phone: string): Promise<{ success: boolean; message: string; code?: string }> {
    try {
      const code = this.generateVerificationCode();
      const expires = Date.now() + 10 * 60 * 1000; // 10 minutes

      // Store the code temporarily
      this.verificationCodes.set(phone, { code, expires, type: 'phone' });

      // In a real app, you would send this via SMS service (Twilio, AWS SNS, etc.)
      // For demo purposes, we'll return the code
      console.log(`Verification code for ${phone}: ${code}`);

      return {
        success: true,
        message: `Verification code sent to ${phone}`,
        code: code // Remove this in production
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || "Failed to send verification code"
      };
    }
  }

  // Verify the code
  static verifyCode(identifier: string, inputCode: string): { success: boolean; message: string } {
    const storedData = this.verificationCodes.get(identifier);

    if (!storedData) {
      return {
        success: false,
        message: "No verification code found. Please request a new one."
      };
    }

    if (Date.now() > storedData.expires) {
      this.verificationCodes.delete(identifier);
      return {
        success: false,
        message: "Verification code has expired. Please request a new one."
      };
    }

    if (storedData.code !== inputCode.toUpperCase()) {
      return {
        success: false,
        message: "Invalid verification code. Please try again."
      };
    }

    // Code is valid, remove it
    this.verificationCodes.delete(identifier);
    return {
        success: true,
        message: "Verification successful!"
    };
  }

  // Create user with email and password after verification
  static async createUserWithEmailPassword(
    email: string, 
    password: string, 
    displayName: string
  ): Promise<User> {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // Update the user's display name
    await updateProfile(userCredential.user, {
      displayName: displayName
    });

    // Send email verification
    await sendEmailVerification(userCredential.user);

    return userCredential.user;
  }

  // Sign in with email and password
  static async signInWithEmailPassword(email: string, password: string): Promise<User> {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  }

  // Login with verification code (for users who prefer not to use passwords)
  static async loginWithVerificationCode(
    identifier: string, 
    verificationCode: string
  ): Promise<{ success: boolean; message: string; tempPassword?: string }> {
    // Verify the code first
    const verification = this.verifyCode(identifier, verificationCode);
    if (!verification.success) {
      return verification;
    }

    // Generate a temporary password for Firebase Auth
    const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
    
    return {
      success: true,
      message: "Verification successful. You can now access your account.",
      tempPassword: tempPassword
    };
  }
}

export default VerificationService;