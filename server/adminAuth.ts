import bcrypt from "bcryptjs";
import { storage } from "./storage";

// Default admin credentials
const DEFAULT_ADMIN = {
  email: "hoseaephraim50@gmail.com",
  password: "Princesali@1",
  id: "admin-default",
  firstName: "Admin",
  lastName: "User",
  role: "admin" as const
};

// Simple session store for admin auth
const adminSessions = new Map<string, any>();

export async function authenticateAdmin(email: string, password: string): Promise<string | null> {
  // Check if it's the default admin
  if (email === DEFAULT_ADMIN.email && password === DEFAULT_ADMIN.password) {
    // Create or update admin user in database
    await storage.upsertUser({
      id: DEFAULT_ADMIN.id,
      email: DEFAULT_ADMIN.email,
      firstName: DEFAULT_ADMIN.firstName,
      lastName: DEFAULT_ADMIN.lastName,
      role: DEFAULT_ADMIN.role
    });
    
    // Create session token
    const sessionToken = generateSessionToken();
    adminSessions.set(sessionToken, {
      userId: DEFAULT_ADMIN.id,
      email: DEFAULT_ADMIN.email,
      role: DEFAULT_ADMIN.role,
      createdAt: new Date()
    });
    
    return sessionToken;
  }
  
  return null;
}

export function verifyAdminSession(token: string): any | null {
  const session = adminSessions.get(token);
  if (!session) return null;
  
  // Check if session is expired (24 hours)
  const now = new Date();
  const sessionAge = now.getTime() - session.createdAt.getTime();
  if (sessionAge > 24 * 60 * 60 * 1000) {
    adminSessions.delete(token);
    return null;
  }
  
  return session;
}

export function destroyAdminSession(token: string): void {
  adminSessions.delete(token);
}

function generateSessionToken(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export function isAdminAuthenticated(req: any, res: any, next: any) {
  const token = req.cookies?.adminToken || req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  const session = verifyAdminSession(token);
  if (!session) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  req.adminUser = session;
  next();
}