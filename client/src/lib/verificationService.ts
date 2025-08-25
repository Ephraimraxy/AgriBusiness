import { createVerificationCode, getVerificationCode, markVerificationCodeAsUsed } from "./firebaseService";

export class VerificationService {
  static generateCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  static async sendVerificationCode(identifier: string, method: 'email' | 'phone'): Promise<{ code: string; success: boolean; message: string }> {
    try {
      const code = this.generateCode();
      
      await createVerificationCode(identifier, code);

      // In a real application, you would send the code via email or SMS
      // For now, we'll just return the code for demonstration
      if (method === 'email') {
        // TODO: Implement email sending logic using Nodemailer
        console.log(`Verification code ${code} sent to email: ${identifier}`);
      } else {
        // TODO: Implement SMS sending logic
        console.log(`Verification code ${code} sent to phone: ${identifier}`);
      }

      return {
        code, // In production, don't return the code
        success: true,
        message: `Verification code sent to your ${method}`
      };
    } catch (error) {
      console.error('Error sending verification code:', error);
      return {
        code: '',
        success: false,
        message: `Failed to send verification code to ${method}`
      };
    }
  }

  static async verifyCode(identifier: string, code: string): Promise<{ success: boolean; message: string; isExpired?: boolean }> {
    try {
      const verificationCode = await getVerificationCode(identifier, code);
      
      if (!verificationCode) {
        return {
          success: false,
          message: 'Invalid verification code'
        };
      }

      if (new Date() > verificationCode.expiresAt) {
        return {
          success: false,
          message: 'Verification code has expired',
          isExpired: true
        };
      }

      await markVerificationCodeAsUsed(verificationCode.id);

      return {
        success: true,
        message: 'Verification successful'
      };
    } catch (error) {
      console.error('Error verifying code:', error);
      return {
        success: false,
        message: 'Error verifying code'
      };
    }
  }
} 