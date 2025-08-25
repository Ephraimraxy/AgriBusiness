export {};

declare global {
  // In-memory map for email verification codes. In production, prefer Redis/DB.
  // eslint-disable-next-line no-var
  var verificationCodes: Record<string, { code: string; expiry: Date }>;
}
