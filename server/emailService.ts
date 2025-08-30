
import nodemailer from 'nodemailer';

type TransportBuild = {
  transporter: nodemailer.Transporter | null;
  devFallback: boolean;
};

function buildTransporter(): TransportBuild {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : undefined;
  const smtpSecure = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : undefined;
  const ignoreTlsErrors = process.env.SMTP_IGNORE_TLS_ERRORS === 'true' || process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0';

  const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER;
  const smtpPass = process.env.SMTP_PASS || process.env.EMAIL_PASS;
  const emailService = process.env.EMAIL_SERVICE || 'gmail';

  // Debug logging to help troubleshoot configuration
  console.log('[EMAIL DEBUG] Environment variables loaded:');
  console.log('[EMAIL DEBUG] SMTP_HOST:', smtpHost);
  console.log('[EMAIL DEBUG] SMTP_PORT:', smtpPort);
  console.log('[EMAIL DEBUG] SMTP_SECURE:', smtpSecure);
  console.log('[EMAIL DEBUG] SMTP_USER:', smtpUser);
  console.log('[EMAIL DEBUG] SMTP_PASS:', smtpPass ? '***SET***' : 'NOT SET');
  console.log('[EMAIL DEBUG] EMAIL_USER:', process.env.EMAIL_USER);
  console.log('[EMAIL DEBUG] EMAIL_PASS:', process.env.EMAIL_PASS ? '***SET***' : 'NOT SET');
  console.log('[EMAIL DEBUG] EMAIL_SERVICE:', emailService);
  console.log('[EMAIL DEBUG] NODE_ENV:', process.env.NODE_ENV);

  // Priority 1: Explicit SMTP host configuration
  if (smtpHost && smtpPort && typeof smtpSecure === 'boolean' && smtpUser && smtpPass) {
    console.log('[EMAIL DEBUG] Using explicit SMTP configuration');
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: { user: smtpUser, pass: smtpPass },
      tls: ignoreTlsErrors ? { rejectUnauthorized: false } : undefined,
    });
    return { transporter, devFallback: false };
  }

  // Priority 2: Provider service (e.g., gmail, outlook, sendgrid, etc.)
  if (smtpUser && smtpPass && emailService) {
    console.log('[EMAIL DEBUG] Using provider service configuration:', emailService);
    const transporter = nodemailer.createTransport({
      service: emailService as any,
      auth: { user: smtpUser, pass: smtpPass },
      tls: ignoreTlsErrors ? { rejectUnauthorized: false } : undefined,
    });
    return { transporter, devFallback: false };
  }

  // Fallback: No credentials configured
  console.warn('[EMAIL DEBUG] No valid SMTP configuration found, using dev fallback');
  return { transporter: null, devFallback: true };
}

const { transporter, devFallback } = buildTransporter();

export async function sendVerificationEmail(email: string, code: string): Promise<boolean> {
  console.log('[EMAIL DEBUG] sendVerificationEmail called with:', { email, code });
  console.log('[EMAIL DEBUG] transporter exists:', !!transporter);
  console.log('[EMAIL DEBUG] devFallback:', devFallback);
  
  // Dev fallback: Return success and emit the code to logs
  if (!transporter || devFallback) {
    const isProd = process.env.NODE_ENV === 'production';
    if (isProd) {
      console.error('[EMAIL] No SMTP configuration found in production. Set SMTP_* or EMAIL_* environment variables.');
      return false;
    }
    console.warn('[DEV] Email not configured. Returning success and logging code.');
    console.info(`[DEV] Verification code for ${email}: ${code}`);
    return true;
  }
  
  try {
    const fromAddress = process.env.EMAIL_FROM || process.env.SMTP_FROM || process.env.SMTP_USER || process.env.EMAIL_USER || 'noreply@cssfarms.ng';
    console.log('[EMAIL DEBUG] Using from address:', fromAddress);
    
    const mailOptions = {
      from: fromAddress,
      to: email,
      subject: 'CSS FARMS - Email Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #2d5a2d; color: white; padding: 20px; text-align: center;">
            <img src="https://cssfarms.ng/wp-content/uploads/2024/12/scrnli_QWDQo0eIg5qH8M.png" alt="CSS FARMS" style="height: 60px; margin-bottom: 10px;">
            <h1>Email Verification</h1>
          </div>
          
          <div style="padding: 30px; background-color: #f9f9f9;">
            <h2 style="color: #2d5a2d;">Welcome to CSS FARMS Training Program!</h2>
            
            <p>Thank you for registering with CSS FARMS Nigeria. To complete your registration, please verify your email address using the verification code below:</p>
            
            <div style="background-color: white; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
              <h3 style="color: #2d5a2d; margin-bottom: 10px;">Your Verification Code</h3>
              <div style="font-size: 32px; font-weight: bold; color: #2d5a2d; letter-spacing: 8px; font-family: monospace;">
                ${code}
              </div>
            </div>
            
            <p style="color: #666;">This code will expire in 10 minutes. If you didn't request this verification, please ignore this email.</p>
            
            <p style="color: #666; margin-top: 30px;">
              Best regards,<br>
              <strong>CSS FARMS Nigeria Team</strong>
            </p>
          </div>
          
          <div style="background-color: #2d5a2d; color: white; padding: 15px; text-align: center; font-size: 12px;">
            <p>© 2024 CSS FARMS Nigeria. All rights reserved.</p>
          </div>
        </div>
      `
    };

    console.log('[EMAIL DEBUG] Attempting to send email...');
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}

export async function sendPasswordResetEmail(email: string, resetUrl: string): Promise<boolean> {
  console.log('[EMAIL DEBUG] sendPasswordResetEmail called with:', { email, resetUrl });
  console.log('[EMAIL DEBUG] transporter exists:', !!transporter);
  console.log('[EMAIL DEBUG] devFallback:', devFallback);
  
  // Dev fallback: Return success and emit the URL to logs
  if (!transporter || devFallback) {
    const isProd = process.env.NODE_ENV === 'production';
    if (isProd) {
      console.error('[EMAIL] No SMTP configuration found in production. Set SMTP_* or EMAIL_* environment variables.');
      return false;
    }
    console.warn('[DEV] Email not configured. Returning success and logging reset URL.');
    console.info(`[DEV] Password reset URL for ${email}: ${resetUrl}`);
    return true;
  }
  
  try {
    const fromAddress = process.env.EMAIL_FROM || process.env.SMTP_FROM || process.env.SMTP_USER || process.env.EMAIL_USER || 'noreply@cssfarms.ng';
    console.log('[EMAIL DEBUG] Using from address:', fromAddress);
    
    const mailOptions = {
      from: fromAddress,
      to: email,
      subject: 'CSS FARMS - Password Reset Request',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #2d5a2d; color: white; padding: 20px; text-align: center;">
            <img src="https://cssfarms.ng/wp-content/uploads/2024/12/scrnli_QWDQo0eIg5qH8M.png" alt="CSS FARMS" style="height: 60px; margin-bottom: 10px;">
            <h1>Password Reset</h1>
          </div>
          
          <div style="padding: 30px; background-color: #f9f9f9;">
            <h2 style="color: #2d5a2d;">Reset Your Password</h2>
            
            <p>You requested to reset your password for your CSS FARMS Training Program account. Click the button below to create a new password:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="display: inline-block; background-color: #2d5a2d; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                Reset My Password
              </a>
            </div>
            
            <p style="color: #666; font-size: 14px;">If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="color: #2d5a2d; font-size: 14px; word-break: break-all;">${resetUrl}</p>
            
            <p style="color: #666;">This link will expire in 1 hour. If you didn't request this password reset, please ignore this email.</p>
            
            <p style="color: #666; margin-top: 30px;">
              Best regards,<br>
              <strong>CSS FARMS Nigeria Team</strong>
            </p>
          </div>
          
          <div style="background-color: #2d5a2d; color: white; padding: 15px; text-align: center; font-size: 12px;">
            <p>© 2024 CSS FARMS Nigeria. All rights reserved.</p>
          </div>
        </div>
      `
    };

    console.log('[EMAIL DEBUG] Attempting to send password reset email...');
    const info = await transporter.sendMail(mailOptions);
    console.log('Password reset email sent successfully:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return false;
  }
}

// Test email configuration
export async function testEmailConnection(): Promise<boolean> {
  try {
    if (!transporter) {
      console.warn('[EMAIL] Transporter not configured. Set SMTP_* or EMAIL_* env vars.');
      return false;
    }
    await transporter.verify();
    console.log('Email service is ready');
    return true;
  } catch (error) {
    console.error('Email service connection failed:', error);
    return false;
  }
}
