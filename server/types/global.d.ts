export {};

declare global {
  // In-memory map for email verification codes. In production, prefer Redis/DB.
  // eslint-disable-next-line no-var
  var verificationCodes: Record<string, { code: string; expiry: Date }>;
  
  // In-memory map for password reset tokens. In production, prefer Redis/DB.
  // eslint-disable-next-line no-var
  var resetTokens: Record<string, { email: string; traineeId: string; expiry: Date }>;
}
