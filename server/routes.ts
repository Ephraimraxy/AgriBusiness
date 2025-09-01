import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { registerVideoFileRoutes } from "./video-file-routes";
// import { setupAuth, isAdminAuthenticated } from "./replitAuth";
import { authenticateAdmin, isAdminAuthenticated, destroyAdminSession, verifyAdminSession } from "./adminAuth";
import { insertSponsorSchema, insertTraineeSchema, insertContentSchema, insertAnnouncementSchema, insertAnnouncementReplySchema, insertExamSchema, insertExamQuestionSchema } from "@shared/schema";
import { z } from "zod";
import * as crypto from "crypto";
import { db } from "./firebase";
import { sendVerificationEmail, sendPasswordResetEmail } from "./emailService";


export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware disabled for now since we're using Firebase and admin auth
  // await setupAuth(app);

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    console.log('[HEALTH CHECK] Server is running');
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Exam routes
  app.post('/api/exams', isAdminAuthenticated, async (req, res) => {
    try {
      const validatedData = insertExamSchema.parse(req.body);
      const exam = await storage.createExam(validatedData);
      res.status(201).json(exam);
    } catch (error) {
      console.error('Error creating exam:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Validation error', details: error.errors });
      }
      res.status(500).json({ error: 'Failed to create exam' });
    }
  });

  // Email deliverability validation (MX check + optional provider) + duplicate checking
  app.post('/api/email/validate', async (req, res) => {
    try {
      const { email } = req.body as { email?: string };
      if (!email || typeof email !== 'string' || !email.includes('@')) {
        return res.status(400).json({ message: 'Valid email is required' });
      }
      const domain = email.split('@')[1];
      if (!domain) {
        return res.status(400).json({ message: 'Invalid email format' });
      }

      // Check for existing email across all collections
      try {
        // Check in trainees collection
        const traineesSnapshot = await db.collection('trainees').where('email', '==', email).limit(1).get();
        if (!traineesSnapshot.empty) {
          return res.status(400).json({ message: 'This email is already registered as a trainee' });
        }

        // Check in staff_registrations collection
        const staffRegSnapshot = await db.collection('staff_registrations').where('email', '==', email).limit(1).get();
        if (!staffRegSnapshot.empty) {
          return res.status(400).json({ message: 'This email is already registered as a staff member' });
        }

        // Check in resource_person_registrations collection
        const rpRegSnapshot = await db.collection('resource_person_registrations').where('email', '==', email).limit(1).get();
        if (!rpRegSnapshot.empty) {
          return res.status(400).json({ message: 'This email is already registered as a resource person' });
        }

        // Check in users collection
        const usersSnapshot = await db.collection('users').where('email', '==', email).limit(1).get();
        if (!usersSnapshot.empty) {
          return res.status(400).json({ message: 'This email is already registered in the system' });
        }

        // Check in staffs collection
        const staffsSnapshot = await db.collection('staffs').where('email', '==', email).limit(1).get();
        if (!staffsSnapshot.empty) {
          return res.status(400).json({ message: 'This email is already registered as a staff member' });
        }

        // Check in resource_persons collection
        const rpSnapshot = await db.collection('resource_persons').where('email', '==', email).limit(1).get();
        if (!rpSnapshot.empty) {
          return res.status(400).json({ message: 'This email is already registered as a resource person' });
        }
      } catch (dbError) {
        console.error('Database check error:', dbError);
        // Continue with email validation even if DB check fails
      }

      // MX record check
      const dns = await import('node:dns/promises');
      let mxRecords: Array<{ exchange: string; priority: number }> = [];
      try {
        mxRecords = await dns.resolveMx(domain);
      } catch {
        mxRecords = [];
      }
      if (!mxRecords || mxRecords.length === 0) {
        return res.status(400).json({ message: 'Email domain has no MX records (cannot receive email)' });
      }

      // Optional: Kickbox verification if API key configured
      const apiKey = process.env.KICKBOX_API_KEY;
      if (apiKey) {
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 5000);
          const resp = await fetch(`https://api.kickbox.com/v2/verify?email=${encodeURIComponent(email)}&apikey=${encodeURIComponent(apiKey)}`, { signal: controller.signal });
          clearTimeout(timer);
          if (resp.ok) {
            const data: any = await resp.json();
            // result: deliverable | undeliverable | risky | unknown
            if (data?.result === 'undeliverable') {
              return res.status(400).json({ message: 'Email appears undeliverable per verification provider' });
            }
          }
        } catch {
          // Ignore provider errors; rely on MX result
        }
      }

      return res.json({ deliverable: true, message: 'Email is valid and available for registration' });
    } catch (err) {
      console.error('Email validation error:', err);
      return res.status(500).json({ message: 'Email validation failed' });
    }
  });

  app.get('/api/exams', isAdminAuthenticated, async (req, res) => {
    try {
      const exams = await storage.getExams();
      res.json(exams);
    } catch (error) {
      console.error('Error fetching exams:', error);
      res.status(500).json({ error: 'Failed to fetch exams' });
    }
  });

  // Public endpoint for trainees to view available exams
  app.get('/api/exams/available', async (req, res) => {
    try {
      const exams = await storage.getExams();
      // Filter to only show active exams
      const availableExams = exams.filter(exam => exam.isActive);
      res.json(availableExams);
    } catch (error) {
      console.error('Error fetching available exams:', error);
      res.status(500).json({ error: 'Failed to fetch available exams' });
    }
  });

  app.get('/api/exams/:id', isAdminAuthenticated, async (req, res) => {
    try {
      const exam = await storage.getExam(req.params.id);
      if (!exam) {
        return res.status(404).json({ error: 'Exam not found' });
      }
      res.json(exam);
    } catch (error) {
      console.error('Error fetching exam:', error);
      res.status(500).json({ error: 'Failed to fetch exam' });
    }
  });

  app.post('/api/exams/:examId/questions', isAdminAuthenticated, async (req, res) => {
    try {
      const validatedData = insertExamQuestionSchema.parse({
        ...req.body,
        examId: req.params.examId
      });
      const question = await storage.createExamQuestion(validatedData);
      res.status(201).json(question);
    } catch (error) {
      console.error('Error creating exam question:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Validation error', details: error.errors });
      }
      res.status(500).json({ error: 'Failed to create exam question' });
    }
  });

  app.get('/api/exams/:examId/questions', isAdminAuthenticated, async (req, res) => {
    try {
      const questions = await storage.getExamQuestions(req.params.examId);
      res.json(questions);
    } catch (error) {
      console.error('Error fetching exam questions:', error);
      res.status(500).json({ error: 'Failed to fetch exam questions' });
    }
  });

  // Public endpoint for trainees to fetch questions from an exam
  app.get('/api/exams/:examId/questions/public', async (req, res) => {
    try {
      const exam = await storage.getExam(req.params.examId);
      if (!exam) {
        return res.status(404).json({ error: 'Exam not found' });
      }
      if (!exam.isActive) {
        return res.status(403).json({ error: 'Exam is not available' });
      }
      const questions = await storage.getExamQuestions(req.params.examId);
      res.json(questions);
    } catch (error) {
      console.error('Error fetching exam questions:', error);
      res.status(500).json({ error: 'Failed to fetch exam questions' });
    }
  });

  // Admin authentication routes
  app.post('/api/admin/login', async (req, res) => {
    try {
      console.log("Admin login request received:", { email: req.body.email, hasPassword: !!req.body.password });
      
      const { email, password } = req.body;

      if (!email || !password) {
        console.log("Missing email or password");
        return res.status(400).json({ message: "Email and password are required" });
      }

      console.log("Attempting to authenticate admin...");
      const sessionToken = await authenticateAdmin(email, password);

      if (!sessionToken) {
        console.log("Authentication failed - invalid credentials");
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Set HTTP-only cookie
      const isProd = process.env.NODE_ENV === 'production';
      res.cookie('adminToken', sessionToken, {
        httpOnly: true,
        secure: isProd, // required for cross-site cookies
        sameSite: isProd ? 'none' : 'lax', // allow cross-site in production (Netlify -> Render)
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        path: '/'
      });

      const adminSession = verifyAdminSession(sessionToken);
      res.json({
        message: "Login successful",
        user: {
          id: adminSession.userId,
          email: adminSession.email,
          role: adminSession.role
        }
      });
    } catch (error) {
      console.error("Admin login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Admin me route to check current session
  app.get('/api/admin/me', (req: any, res) => {
    const token = req.cookies?.adminToken;

    if (!token) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    // verifyAdminSession has already been imported at the top of the file using ESM import style
// so we can call it directly to ensure the same module instance is used

    const session = verifyAdminSession(token);
    if (!session) {
      return res.status(401).json({ message: "Session expired" });
    }

    res.json({
      id: session.userId,
      email: session.email,
      role: session.role
    });
  });

  app.post('/api/admin/logout', (req, res) => {
    const token = (req as any).cookies?.adminToken;
    if (token) {
      try {
        destroyAdminSession(token);
      } catch {}
      const isProd = process.env.NODE_ENV === 'production';
      res.clearCookie('adminToken', { path: '/', httpOnly: true, sameSite: isProd ? 'none' : 'lax', secure: isProd });
    }
    res.status(200).json({ message: 'Logged out' });
  });

  // User profile creation route for Firebase Auth
  app.post('/api/users/profile', async (req, res) => {
    try {
      const { uid, email, firstName, lastName } = req.body;

      await db.collection('users').doc(uid).set({
        id: uid,
        email,
        firstName,
        lastName,
        role: 'trainee',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      res.json({ message: 'User profile created successfully' });
    } catch (error) {
      console.error('Error creating user profile:', error);
      res.status(500).json({ message: 'Failed to create user profile' });
    }
  });

  // Combined auth route that handles Admin Auth only for now
  app.post('/api/auth', async (req, res) => {
    try {
      // Check for admin token first
      const adminToken = req.cookies?.adminToken;
      if (adminToken) {
        const adminSession = verifyAdminSession(adminToken);
        if (adminSession) {
          const user = await storage.getUser("admin-default");
          if (user) {
            return res.json(user);
          }
        }
      }

      // For now, return 401 for all non-admin requests
      return res.status(401).json({ message: "Unauthorized" });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // System settings routes
  app.get('/api/settings/:key', async (req, res) => {
    try {
      const setting = await storage.getSystemSetting(req.params.key);
      res.json(setting);
    } catch (error) {
      console.error("Error fetching setting:", error);
      res.status(500).json({ message: "Failed to fetch setting" });
    }
  });

  app.post('/api/settings', isAdminAuthenticated, async (req: any, res) => {
    try {
      const { key, value } = req.body;
      const setting = await storage.updateSystemSetting(key, value);
      res.json(setting);
    } catch (error) {
      console.error("Error updating setting:", error);
      res.status(500).json({ message: "Failed to update setting" });
    }
  });

  // User routes
  app.get('/api/users', async (req, res) => {
    try {
      const users = await storage.getUsers();
      res.json(users);
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ message: 'Failed to fetch users' });
    }
  });

  app.get('/api/users/email/:email', async (req, res) => {
    try {
      const { email } = req.params;
      console.log('[API DEBUG] Looking up user by email:', email);
      
      // Try to find user in different collections
      const trainee = await storage.getTraineeByEmail(email);
      if (trainee) {
        console.log('[API DEBUG] Found trainee:', trainee.id);
        return res.json(trainee);
      }
      
      // Add other user type lookups here if needed
      // const staff = await storage.getStaffByEmail(email);
      // const resourcePerson = await storage.getResourcePersonByEmail(email);
      
      console.log('[API DEBUG] User not found');
      res.status(404).json({ message: 'User not found' });
    } catch (error) {
      console.error('Error fetching user by email:', error);
      res.status(500).json({ message: 'Failed to fetch user' });
    }
  });

  app.get('/api/trainees/email/:email', async (req, res) => {
    try {
      const { email } = req.params;
      console.log('[API DEBUG] Looking up trainee by email:', email);
      
      const trainee = await storage.getTraineeByEmail(email);
      if (trainee) {
        console.log('[API DEBUG] Found trainee:', trainee.id);
        return res.json(trainee);
      }
      
      console.log('[API DEBUG] Trainee not found');
      res.status(404).json({ message: 'Trainee not found' });
    } catch (error) {
      console.error('Error fetching trainee by email:', error);
      res.status(500).json({ message: 'Failed to fetch trainee' });
    }
  });

  app.get('/api/batches', async (req, res) => {
    try {
      const batches = await storage.getBatches();
      res.json(batches);
    } catch (error) {
      console.error('Error fetching batches:', error);
      res.status(500).json({ message: 'Failed to fetch batches' });
    }
  });

  // Additional collection endpoints for staff registration
  app.get('/api/staff_registrations', async (req, res) => {
    try {
      const registrations = await storage.getStaffRegistrations();
      res.json(registrations);
    } catch (error) {
      console.error('Error fetching staff registrations:', error);
      res.status(500).json({ message: 'Failed to fetch staff registrations' });
    }
  });

  app.get('/api/resource_person_registrations', async (req, res) => {
    try {
      const registrations = await storage.getResourcePersonRegistrations();
      res.json(registrations);
    } catch (error) {
      console.error('Error fetching resource person registrations:', error);
      res.status(500).json({ message: 'Failed to fetch resource person registrations' });
    }
  });

  app.get('/api/staffs', async (req, res) => {
    try {
      const staffs = await storage.getStaffs();
      res.json(staffs);
    } catch (error) {
      console.error('Error fetching staffs:', error);
      res.status(500).json({ message: 'Failed to fetch staffs' });
    }
  });

  app.get('/api/resource_persons', async (req, res) => {
    try {
      const resourcePersons = await storage.getResourcePersons();
      res.json(resourcePersons);
    } catch (error) {
      console.error('Error fetching resource persons:', error);
      res.status(500).json({ message: 'Failed to fetch resource persons' });
    }
  });

  // Sponsor routes
  app.get('/api/sponsors', async (req, res) => {
    try {
      const sponsors = await storage.getSponsors();
      res.json(sponsors);
    } catch (error) {
      console.error("Error fetching sponsors:", error);
      res.status(500).json({ message: "Failed to fetch sponsors" });
    }
  });

  app.get('/api/sponsors/active', async (req, res) => {
    try {
      const activeSponsor = await storage.getActiveSponsor();
      res.json(activeSponsor);
    } catch (error) {
      console.error("Error fetching active sponsor:", error);
      res.status(500).json({ message: "Failed to fetch active sponsor" });
    }
  });

  app.post('/api/sponsors', isAdminAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertSponsorSchema.parse(req.body);
      const sponsor = await storage.createSponsor(validatedData);
      res.json(sponsor);
    } catch (error) {
      console.error("Error creating sponsor:", error);
      res.status(500).json({ message: "Failed to create sponsor" });
    }
  });

  app.patch('/api/sponsors/:id', isAdminAuthenticated, async (req: any, res) => {
    try {
      const id = req.params.id;
      const validatedData = insertSponsorSchema.partial().parse(req.body);

      // If setting this sponsor as active, deactivate all others first
      if (validatedData.isActive) {
        await storage.deactivateAllSponsors();
      }

      const sponsor = await storage.updateSponsor(id, validatedData);
      res.json(sponsor);
    } catch (error) {
      console.error("Error updating sponsor:", error);
      res.status(500).json({ message: "Failed to update sponsor" });
    }
  });

  app.delete('/api/sponsors/:id', isAdminAuthenticated, async (req: any, res) => {
    try {
      const id = req.params.id;
      await storage.deleteSponsor(id);
      res.json({ message: "Sponsor deleted successfully" });
    } catch (error) {
      console.error("Error deleting sponsor:", error);
      res.status(500).json({ message: "Failed to delete sponsor" });
    }
  });

  // Trainee routes
  app.get('/api/trainees', isAdminAuthenticated, async (req, res) => {
    try {
      const { sponsorId } = req.query;
      let trainees;

      if (sponsorId) {
        trainees = await storage.getTraineesBySponsor(sponsorId as string);
      } else {
        trainees = await storage.getTrainees();
      }

      res.json(trainees);
    } catch (error) {
      console.error("Error fetching trainees:", error);
      res.status(500).json({ message: "Failed to fetch trainees" });
    }
  });

  app.get('/api/trainees/:id', isAdminAuthenticated, async (req, res) => {
    try {
      const traineeId = req.params.id;
      const trainee = await storage.getTrainee(traineeId);
      
      if (!trainee) {
        return res.status(404).json({ message: "Trainee not found" });
      }
      
      res.json(trainee);
    } catch (error) {
      console.error("Error fetching trainee:", error);
      res.status(500).json({ message: "Failed to fetch trainee" });
    }
  });

  // Trainee can get their own data by email
  app.get('/api/trainees/me/:email', async (req, res) => {
    try {
      const email = req.params.email;
      const trainee = await storage.getTraineeByEmail(email);
      
      if (!trainee) {
        return res.status(404).json({ message: "Trainee not found" });
      }
      
      res.json(trainee);
    } catch (error) {
      console.error("Error fetching trainee by email:", error);
      res.status(500).json({ message: "Failed to fetch trainee" });
    }
  });

  // Registration routes
  app.post('/api/register/step1', async (req, res) => {
    try {
      const { email, password, confirmPassword } = req.body;

      if (password !== confirmPassword) {
        return res.status(400).json({ message: "Passwords do not match" });
      }

      // Check if email already exists
      const existingTrainee = await storage.getTraineeByEmail(email);
      if (existingTrainee) {
        return res.status(400).json({ message: "Email already registered" });
      }

      // Generate verification code
      const verificationCode = crypto.randomInt(100000, 999999).toString();
      const verificationCodeExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Store verification code temporarily (you might want to use Redis or database for production)
      // For now, we'll store it in memory with expiry
      global.verificationCodes = global.verificationCodes || {};
      global.verificationCodes[email] = {
        code: verificationCode,
        expiry: verificationCodeExpiry
      };

      // Send verification email
      console.log('[SERVER DEBUG] About to send verification email to:', email);
      console.log('[SERVER DEBUG] Environment variables check:');
      console.log('[SERVER DEBUG] EMAIL_USER:', process.env.EMAIL_USER ? 'SET' : 'NOT SET');
      console.log('[SERVER DEBUG] EMAIL_PASS:', process.env.EMAIL_PASS ? 'SET' : 'NOT SET');
      console.log('[SERVER DEBUG] EMAIL_SERVICE:', process.env.EMAIL_SERVICE);
      console.log('[SERVER DEBUG] NODE_ENV:', process.env.NODE_ENV);
      
      const emailSent = await sendVerificationEmail(email, verificationCode);
      console.log('[SERVER DEBUG] sendVerificationEmail result:', emailSent);

      if (!emailSent) {
        console.error('[SERVER DEBUG] Email sending failed, returning 500 error');
        return res.status(500).json({ message: "Failed to send verification email. Please try again." });
      }

      console.log(`Verification code for ${email}: ${verificationCode}`); // Keep for debugging

      res.json({ 
        message: "Verification code sent to your email address",
        email,
        // Only return devCode when not in production and transporter isn’t configured
        devCode: (process.env.NODE_ENV !== 'production' && (!process.env.SMTP_USER && !process.env.EMAIL_USER)) ? verificationCode : undefined
      });
    } catch (error) {
      console.error("Error in registration step 1:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post('/api/register/verify', async (req, res) => {
    try {
      const { email, code } = req.body;

      // Check stored verification codes
      global.verificationCodes = global.verificationCodes || {};
      const storedData = global.verificationCodes[email];

      if (!storedData) {
        return res.status(400).json({ message: "No verification code found for this email" });
      }

      if (new Date() > storedData.expiry) {
        // Clean up expired code
        delete global.verificationCodes[email];
        return res.status(400).json({ message: "Verification code has expired" });
      }

      if (storedData.code !== code) {
        return res.status(400).json({ message: "Invalid verification code" });
      }

      // Clean up used code
      delete global.verificationCodes[email];

      res.json({ message: "Email verified successfully" });
    } catch (error) {
      console.error("Error in email verification:", error);
      res.status(500).json({ message: "Verification failed" });
    }
  });

  app.post('/api/register/complete', async (req, res) => {
    try {
      const traineeData = insertTraineeSchema.parse(req.body);

      // Get active sponsor
      const activeSponsor = await storage.getActiveSponsor();
      if (!activeSponsor) {
        return res.status(400).json({ message: "No active sponsor for registration" });
      }

      // Create trainee with sponsor assignment
      const trainee = await storage.createTrainee({
        ...traineeData,
        sponsorId: activeSponsor.id,
        emailVerified: true,
      });

      res.json({
        message: "Registration completed successfully",
        trainee: {
          id: trainee.id,
          traineeId: trainee.traineeId,
          tagNumber: trainee.tagNumber,
          email: trainee.email,
        }
      });
    } catch (error) {
      console.error("Error completing registration:", error);
      res.status(500).json({ message: "Registration completion failed" });
    }
  });

  // Password reset endpoints
  app.post('/api/auth/forgot-password', async (req, res) => {
    try {
      console.log('[PASSWORD RESET DEBUG] Forgot password request received:', req.body);
      const { email } = req.body;
      
      if (!email) {
        console.log('[PASSWORD RESET DEBUG] No email provided');
        return res.status(400).json({ message: "Email is required" });
      }

      console.log('[PASSWORD RESET DEBUG] Looking up trainee with email:', email);
      // Check if email exists in any collection
      const existingTrainee = await storage.getTraineeByEmail(email);
      if (!existingTrainee) {
        console.log('[PASSWORD RESET DEBUG] No trainee found with email:', email);
        return res.status(404).json({ message: "No account found with this email address" });
      }

      console.log('[PASSWORD RESET DEBUG] Trainee found:', existingTrainee.id);
      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      console.log('[PASSWORD RESET DEBUG] Generated token:', resetToken);
      console.log('[PASSWORD RESET DEBUG] Token expiry:', resetTokenExpiry);

      // Store reset token in Firebase
      try {
        await storage.createPasswordResetToken(resetToken, email, existingTrainee.id, resetTokenExpiry);
        console.log('[PASSWORD RESET DEBUG] Token stored successfully');
      } catch (storageError) {
        console.error('[PASSWORD RESET ERROR] Failed to store token:', storageError);
        return res.status(500).json({ message: "Failed to create reset token. Please try again." });
      }

      // Clean up expired tokens
      try {
        await storage.cleanupExpiredPasswordResetTokens();
        console.log('[PASSWORD RESET DEBUG] Cleanup completed');
      } catch (cleanupError) {
        console.error('[PASSWORD RESET WARNING] Cleanup failed:', cleanupError);
        // Don't fail the request for cleanup errors
      }

      // Create reset URL
      const baseUrl = process.env.NODE_ENV === 'production' 
        ? (process.env.RENDER_EXTERNAL_URL || 'https://agribusiness-2.onrender.com')
        : 'http://localhost:5173';
      const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;
      
      console.log('[PASSWORD RESET DEBUG] Generated reset URL:', resetUrl);

      // Send reset email with link
      try {
        const emailSent = await sendPasswordResetEmail(email, resetUrl);
        
        if (!emailSent) {
          console.error('[PASSWORD RESET ERROR] Email sending failed');
          return res.status(500).json({ message: "Failed to send password reset email. Please try again." });
        }
        
        console.log('[PASSWORD RESET DEBUG] Email sent successfully');
      } catch (emailError) {
        console.error('[PASSWORD RESET ERROR] Email sending error:', emailError);
        return res.status(500).json({ message: "Failed to send password reset email. Please try again." });
      }

      console.log('[PASSWORD RESET DEBUG] Password reset request completed successfully');
      res.json({ 
        message: "Password reset link sent to your email address",
        email
      });
    } catch (error) {
      console.error("[PASSWORD RESET ERROR] Error in forgot password:", error);
      res.status(500).json({ message: "Password reset request failed" });
    }
  });



  app.post('/api/auth/reset-password', async (req, res) => {
    try {
      console.log('[PASSWORD RESET DEBUG] Reset password request received:', { token: req.body.token ? '***' : 'missing', hasPassword: !!req.body.newPassword });
      const { token, newPassword } = req.body;
      
      if (!token || !newPassword) {
        console.log('[PASSWORD RESET DEBUG] Missing token or password');
        return res.status(400).json({ message: "Token and new password are required" });
      }

      // Validate password strength
      if (newPassword.length < 6) {
        console.log('[PASSWORD RESET DEBUG] Password too short');
        return res.status(400).json({ message: "Password must be at least 6 characters long" });
      }

      // Check stored reset tokens
      let storedData;
      try {
        storedData = await storage.getPasswordResetToken(token);
        console.log('[PASSWORD RESET DEBUG] Retrieved stored data:', storedData ? 'exists' : 'not found');
      } catch (storageError) {
        console.error('[PASSWORD RESET ERROR] Failed to get token from storage:', storageError);
        return res.status(500).json({ message: "Failed to verify token. Please try again." });
      }

      if (!storedData) {
        console.log('[PASSWORD RESET DEBUG] Token not found in storage');
        return res.status(400).json({ message: "Invalid or expired reset token" });
      }

      if (new Date() > storedData.expiry) {
        console.log('[PASSWORD RESET DEBUG] Token expired');
        // Clean up expired token
        try {
          await storage.deletePasswordResetToken(token);
        } catch (deleteError) {
          console.error('[PASSWORD RESET WARNING] Failed to delete expired token:', deleteError);
        }
        return res.status(400).json({ message: "Reset token has expired" });
      }

      // Update trainee password in Firebase Auth
      try {
        console.log('[PASSWORD RESET DEBUG] Getting trainee data for ID:', storedData.traineeId);
        // Get the trainee to find their email
        const trainee = await storage.getTrainee(storedData.traineeId);
        if (!trainee || !trainee.email) {
          console.error('[PASSWORD RESET ERROR] Trainee not found or no email:', { traineeId: storedData.traineeId, hasTrainee: !!trainee, hasEmail: !!trainee?.email });
          throw new Error("Trainee not found or no email");
        }

        console.log('[PASSWORD RESET DEBUG] Updating password for email:', trainee.email);
        // Update password in Firebase Auth using Admin SDK
        const { getAuth } = await import('firebase-admin/auth');
        const auth = getAuth();
        
        // Find user by email and update password
        const userRecord = await auth.getUserByEmail(trainee.email);
        await auth.updateUser(userRecord.uid, {
          password: newPassword
        });

        console.log('[PASSWORD RESET DEBUG] Password updated successfully');
        // Clean up used token
        try {
          await storage.deletePasswordResetToken(token);
          console.log('[PASSWORD RESET DEBUG] Token deleted after successful password update');
        } catch (deleteError) {
          console.error('[PASSWORD RESET WARNING] Failed to delete used token:', deleteError);
        }

        res.json({ message: "Password reset successfully" });
      } catch (updateError) {
        console.error("[PASSWORD RESET ERROR] Error updating password:", updateError);
        res.status(500).json({ message: "Failed to update password. Please try again." });
      }
    } catch (error) {
      console.error("[PASSWORD RESET ERROR] Error in reset password:", error);
      res.status(500).json({ message: "Password reset failed" });
    }
  });

  // Verify reset token endpoint
  app.get('/api/auth/verify-reset-token/:token', async (req, res) => {
    try {
      const { token } = req.params;
      
      console.log('[PASSWORD RESET DEBUG] Verifying token:', token);
      
      if (!token) {
        console.log('[PASSWORD RESET DEBUG] No token provided');
        return res.status(400).json({ message: "Token is required" });
      }

      // Check stored reset tokens
      let storedData;
      try {
        storedData = await storage.getPasswordResetToken(token);
        console.log('[PASSWORD RESET DEBUG] Stored data for token:', storedData);
      } catch (storageError) {
        console.error('[PASSWORD RESET ERROR] Failed to get token from storage:', storageError);
        return res.status(500).json({ message: "Failed to verify token. Please try again." });
      }

      if (!storedData) {
        console.log('[PASSWORD RESET DEBUG] Token not found in storage');
        return res.status(400).json({ message: "Invalid reset token" });
      }

      if (new Date() > storedData.expiry) {
        console.log('[PASSWORD RESET DEBUG] Token expired');
        // Clean up expired token
        try {
          await storage.deletePasswordResetToken(token);
        } catch (deleteError) {
          console.error('[PASSWORD RESET WARNING] Failed to delete expired token:', deleteError);
        }
        return res.status(400).json({ message: "Reset token has expired" });
      }

      console.log('[PASSWORD RESET DEBUG] Token is valid for email:', storedData.email);
      res.json({ 
        message: "Token is valid",
        email: storedData.email
      });
    } catch (error) {
      console.error("[PASSWORD RESET ERROR] Error in verify reset token:", error);
      res.status(500).json({ message: "Token verification failed" });
    }
  });

  // Content routes
  app.get('/api/content', async (req, res) => {
    try {
      const { sponsorId } = req.query;
      let content;

      if (sponsorId) {
        content = await storage.getContentBySponsor(sponsorId as string);
      } else {
        content = await storage.getContent();
      }

      res.json(content);
    } catch (error) {
      console.error("Error fetching content:", error);
      res.status(500).json({ message: "Failed to fetch content" });
    }
  });

  app.post('/api/content', isAdminAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertContentSchema.parse(req.body);
      const content = await storage.createContent(validatedData);
      res.json(content);
    } catch (error) {
      console.error("Error creating content:", error);
      res.status(500).json({ message: "Failed to create content" });
    }
  });

  // Progress routes
  app.get('/api/progress/:traineeId', isAdminAuthenticated, async (req, res) => {
    try {
      const traineeId = req.params.traineeId;
      const progress = await storage.getTraineeProgress(traineeId);
      res.json(progress);
    } catch (error) {
      console.error("Error fetching progress:", error);
      res.status(500).json({ message: "Failed to fetch progress" });
    }
  });

  app.post('/api/progress', isAdminAuthenticated, async (req: any, res) => {
    try {
      const { traineeId, contentId, ...progressData } = req.body;
      const progress = await storage.updateProgress(traineeId, contentId, progressData);
      res.json(progress);
    } catch (error) {
      console.error("Error updating progress:", error);
      res.status(500).json({ message: "Failed to update progress" });
    }
  });

  // Announcement routes
  app.get('/api/announcements', async (req, res) => {
    try {
      const { sponsorId } = req.query;
      let announcements;

      if (sponsorId) {
        announcements = await storage.getAnnouncementsBySponsor(sponsorId as string);
      } else {
        announcements = await storage.getAnnouncements();
      }

      res.json(announcements);
    } catch (error) {
      console.error("Error fetching announcements:", error);
      res.status(500).json({ message: "Failed to fetch announcements" });
    }
  });

  app.post('/api/announcements', isAdminAuthenticated, async (req: any, res) => {
    try {
      console.log("Creating announcement with data:", req.body);
      const validatedData = insertAnnouncementSchema.parse(req.body);
      const announcement = await storage.createAnnouncement(validatedData, req.user);
      res.json(announcement);
    } catch (error) {
      console.error("Error creating announcement:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Failed to create announcement" });
    }
  });

  app.patch('/api/announcements/:id', isAdminAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { isActive } = req.body;
      const announcement = await storage.updateAnnouncement(id, { isActive });
      res.json(announcement);
    } catch (error) {
      console.error("Error updating announcement:", error);
      res.status(500).json({ message: "Failed to update announcement" });
    }
  });

  app.delete('/api/announcements/:id', isAdminAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteAnnouncement(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting announcement:", error);
      res.status(500).json({ message: "Failed to delete announcement" });
    }
  });

  // Announcement Reply routes
  app.get('/api/announcements/:id/replies', async (req: any, res) => {
    try {
      const { id } = req.params;
      console.log("Fetching replies for announcement:", id);
      
      if (!id) {
        return res.status(400).json({ message: "Announcement ID is required" });
      }
      
      const replies = await storage.getAnnouncementReplies(id);
      console.log("Replies fetched successfully:", replies.length);
      res.json(replies);
    } catch (error: any) {
      console.error("Error fetching replies:", error);
      
      // Handle Firebase index error gracefully
      if (error.code === 'failed-precondition' || error.message?.includes('index')) {
        console.log("Firebase index not ready, returning empty array");
        return res.json([]);
      }
      
      res.status(500).json({ 
        message: "Failed to fetch replies",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.post('/api/announcements/:id/replies', async (req: any, res) => {
    try {
      const { id } = req.params;
      const { message, replyToId } = req.body;
      
      console.log(`Creating reply for announcement ${id}:`, { message, replyToId });
      
      // For now, allow replies without strict authentication
      // In a production system, you'd verify Firebase JWT tokens here
      // Check if this is an admin reply (has replyToId) or trainee reply
      const isAdminReply = !!replyToId;
      const mockUser = {
        id: isAdminReply ? 'admin-user' : 'trainee-user',
        firstName: isAdminReply ? 'Admin' : 'Trainee',
        lastName: isAdminReply ? 'User' : 'User',
        role: isAdminReply ? 'admin' : 'trainee'
      };
      
      console.log(`Mock user:`, mockUser);
      
      // Validate the reply data
      const validatedData = insertAnnouncementReplySchema.parse({
        announcementId: id,
        message,
        replyToId
      });
      
      console.log(`Validated data:`, validatedData);
      
      console.log(`Calling storage.createAnnouncementReply with:`, { validatedData, mockUser });
      
      const reply = await storage.createAnnouncementReply(
        validatedData,
        mockUser
      );
      
      console.log(`Reply created successfully:`, reply);

      // If this is an admin replying to a trainee (replyToId exists), create a notification
      if (replyToId && mockUser.role === 'admin') {
        // Create notification asynchronously without blocking the reply
        setImmediate(async () => {
          try {
            console.log(`Creating notification for admin reply. ReplyToId: ${replyToId}, AnnouncementId: ${id}`);
            
            // Get the original reply to find the trainee
            const replies = await storage.getAnnouncementReplies(id);
            console.log(`Found ${replies.length} replies for announcement ${id}`);
            
            const originalReply = replies.find(r => r.id === replyToId);
            console.log(`Original reply found:`, originalReply ? 'Yes' : 'No');
            
            if (originalReply && originalReply.fromRole === 'trainee') {
              console.log(`Creating notification for trainee: ${originalReply.fromId}`);
              
              // Create notification for the trainee
              const notification = await storage.createNotification({
                userId: originalReply.fromId,
                type: 'admin_reply',
                title: 'Admin Response',
                message: `Admin ${mockUser.firstName} ${mockUser.lastName} replied to your response: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"`,
                announcementId: id,
                replyId: reply.id,
                fromId: mockUser.id,
                fromName: `${mockUser.firstName} ${mockUser.lastName}`,
                isRead: false,
              });
              
              console.log(`Notification created successfully: ${notification.id}`);
            } else {
              console.log(`No valid original reply found for notification creation`);
            }
          } catch (notificationError) {
            console.error("Error creating notification:", notificationError);
            console.error("Notification error details:", {
              replyToId,
              announcementId: id,
              mockUser,
              error: notificationError instanceof Error ? notificationError.message : 'Unknown error'
            });
            // Don't fail the reply if notification fails - just log the error
          }
        });
      }

      res.json(reply);
    } catch (error) {
      console.error("Error creating reply:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Failed to create reply" });
    }
  });

  // Notification routes
  app.get('/api/notifications', async (req: any, res) => {
    try {
      // For now, use a mock user ID - in production, get from authenticated user
      const userId = req.query.userId || 'trainee-user';
      console.log(`Fetching notifications for user: ${userId}`);
      
      const notifications = await storage.getNotifications(userId);
      console.log(`Found ${notifications.length} notifications for user ${userId}`);
      
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      console.error("Error details:", {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.patch('/api/notifications/:id/read', async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.markNotificationAsRead(id);
      res.json({ message: "Notification marked as read" });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  // Register video & file upload routes
  registerVideoFileRoutes(app);

  // Exam routes
  app.get('/api/exams', isAdminAuthenticated, async (req, res) => {
    try {
      const { sponsorId } = req.query;
      const exams = await storage.getExams(sponsorId as string | undefined);
      res.json(exams);
    } catch (error) {
      console.error('Error fetching exams:', error);
      res.status(500).json({ message: 'Failed to fetch exams' });
    }
  });

  app.get('/api/exams/:id', isAdminAuthenticated, async (req, res) => {
    try {
      const exam = await storage.getExam(req.params.id);
      if (!exam) {
        return res.status(404).json({ message: 'Exam not found' });
      }
      res.json(exam);
    } catch (error) {
      console.error('Error fetching exam:', error);
      res.status(500).json({ message: 'Failed to fetch exam' });
    }
  });

  app.post('/api/exams', isAdminAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertExamSchema.parse(req.body);
      const exam = await storage.createExam(validatedData);
      res.status(201).json(exam);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: 'Validation error', 
          errors: error.errors 
        });
      }
      console.error('Error creating exam:', error);
      res.status(500).json({ message: 'Failed to create exam' });
    }
  });

  app.put('/api/exams/:id', isAdminAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertExamSchema.partial().parse(req.body);
      const exam = await storage.updateExam(req.params.id, validatedData);
      res.json(exam);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: 'Validation error', 
          errors: error.errors 
        });
      }
      console.error('Error updating exam:', error);
      res.status(500).json({ message: 'Failed to update exam' });
    }
  });

  app.delete('/api/exams/:id', isAdminAuthenticated, async (req, res) => {
    try {
      await storage.deleteExam(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting exam:', error);
      res.status(500).json({ message: 'Failed to delete exam' });
    }
  });

  // Exam question routes
  app.get('/api/exams/:examId/questions', isAdminAuthenticated, async (req, res) => {
    try {
      const questions = await storage.getExamQuestions(req.params.examId);
      res.json(questions);
    } catch (error) {
      console.error('Error fetching exam questions:', error);
      res.status(500).json({ message: 'Failed to fetch exam questions' });
    }
  });

  app.post('/api/exams/:examId/questions', isAdminAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertExamQuestionSchema.parse({
        ...req.body,
        examId: req.params.examId
      });
      const question = await storage.createExamQuestion(validatedData);
      res.status(201).json(question);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: 'Validation error', 
          errors: error.errors 
        });
      }
      console.error('Error creating exam question:', error);
      res.status(500).json({ message: 'Failed to create exam question' });
    }
  });

  app.put('/api/questions/:id', isAdminAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertExamQuestionSchema.partial().parse(req.body);
      const question = await storage.updateExamQuestion(req.params.id, validatedData);
      res.json(question);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: 'Validation error', 
          errors: error.errors 
        });
      }
      console.error('Error updating exam question:', error);
      res.status(500).json({ message: 'Failed to update exam question' });
    }
  });

  app.delete('/api/questions/:id', isAdminAuthenticated, async (req, res) => {
    try {
      await storage.deleteExamQuestion(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting exam question:', error);
      res.status(500).json({ message: 'Failed to delete exam question' });
    }
  });

  // Exam attempt routes
  app.get('/api/exam-attempts', isAdminAuthenticated, async (req, res) => {
    try {
      const { examId, traineeId } = req.query;
      const attempts = await storage.getExamAttempts(
        examId as string | undefined, 
        traineeId as string | undefined
      );
      res.json(attempts);
    } catch (error) {
      console.error('Error fetching exam attempts:', error);
      res.status(500).json({ message: 'Failed to fetch exam attempts' });
    }
  });

  app.post('/api/exams/:examId/start', async (req: any, res) => {
    try {
      const { traineeId } = req.body;
      if (!traineeId) {
        return res.status(400).json({ message: 'Trainee ID is required' });
      }
      const attempt = await storage.startExamAttempt(req.params.examId, traineeId);
      res.status(201).json(attempt);
    } catch (error) {
      console.error('Error starting exam attempt:', error);
      res.status(500).json({ message: 'Failed to start exam attempt' });
    }
  });

  app.post('/api/exam-attempts/:attemptId/submit', async (req: any, res) => {
    try {
      const { answers } = req.body;
      if (!Array.isArray(answers)) {
        return res.status(400).json({ message: 'Answers must be an array' });
      }
      const attempt = await storage.submitExamAttempt(req.params.attemptId, answers);
      res.json(attempt);
    } catch (error) {
      console.error('Error submitting exam attempt:', error);
      res.status(500).json({ message: 'Failed to submit exam attempt' });
    }
  });

  app.post('/api/exam-attempts/:attemptId/grade', isAdminAuthenticated, async (req, res) => {
    try {
      const attempt = await storage.gradeExamAttempt(req.params.attemptId);
      res.json(attempt);
    } catch (error) {
      console.error('Error grading exam attempt:', error);
      res.status(500).json({ message: 'Failed to grade exam attempt' });
    }
  });


  // Statistics routes
  app.get('/api/statistics', isAdminAuthenticated, async (req, res) => {
    try {
      const statistics = await storage.getStatistics();
      res.json(statistics);
    } catch (error) {
      console.error("Error fetching statistics:", error);
      res.status(500).json({ message: "Failed to fetch statistics" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

/* Duplicate block disabled
// Import exam-related schemas and dependencies
import { insertExamSchema, insertExamQuestionSchema } from "@shared/schema";
      // Check stored verification codes

      global.verificationCodes = global.verificationCodes || {};

      const storedData = global.verificationCodes[email];



      if (!storedData) {

        return res.status(400).json({ message: "No verification code found for this email" });

      }



      if (new Date() > storedData.expiry) {

        // Clean up expired code

        delete global.verificationCodes[email];

        return res.status(400).json({ message: "Verification code has expired" });

      }



      if (storedData.code !== code) {

        return res.status(400).json({ message: "Invalid verification code" });

      }



      // Clean up used code

      delete global.verificationCodes[email];



      res.json({ message: "Email verified successfully" });

    } catch (error) {

      console.error("Error in email verification:", error);

      res.status(500).json({ message: "Verification failed" });

    }

  });



  app.post('/api/register/complete', async (req, res) => {

    try {

      const traineeData = insertTraineeSchema.parse(req.body);



      // Get active sponsor

      const activeSponsor = await storage.getActiveSponsor();

      if (!activeSponsor) {

        return res.status(400).json({ message: "No active sponsor for registration" });

      }



      // Create trainee with sponsor assignment

      const trainee = await storage.createTrainee({

        ...traineeData,

        sponsorId: activeSponsor.id,

        emailVerified: true,

      });



      res.json({

        message: "Registration completed successfully",

        trainee: {

          id: trainee.id,

          traineeId: trainee.traineeId,

          tagNumber: trainee.tagNumber,

          email: trainee.email,

        }

      });

    } catch (error) {

      console.error("Error completing registration:", error);

      res.status(500).json({ message: "Registration completion failed" });

    }

  });



  // Content routes

  app.get('/api/content', async (req, res) => {

    try {

      const { sponsorId } = req.query;

      let content;



      if (sponsorId) {

        content = await storage.getContentBySponsor(sponsorId as string);

      } else {

        content = await storage.getContent();

      }



      res.json(content);

    } catch (error) {

      console.error("Error fetching content:", error);

      res.status(500).json({ message: "Failed to fetch content" });

    }

  });



  app.post('/api/content', isAdminAuthenticated, async (req: any, res) => {

    try {

      const validatedData = insertContentSchema.parse(req.body);

      const content = await storage.createContent(validatedData);

      res.json(content);

    } catch (error) {

      console.error("Error creating content:", error);

      res.status(500).json({ message: "Failed to create content" });

    }

  });



  // Progress routes

  app.get('/api/progress/:traineeId', isAdminAuthenticated, async (req, res) => {

    try {

      const traineeId = req.params.traineeId;

      const progress = await storage.getTraineeProgress(traineeId);

      res.json(progress);

    } catch (error) {

      console.error("Error fetching progress:", error);

      res.status(500).json({ message: "Failed to fetch progress" });

    }

  });



  app.post('/api/progress', isAdminAuthenticated, async (req: any, res) => {

    try {

      const { traineeId, contentId, ...progressData } = req.body;

      const progress = await storage.updateProgress(traineeId, contentId, progressData);

      res.json(progress);

    } catch (error) {

      console.error("Error updating progress:", error);

      res.status(500).json({ message: "Failed to update progress" });

    }

  });



  // Announcement routes

  app.get('/api/announcements', async (req, res) => {

    try {

      const { sponsorId } = req.query;

      let announcements;



      if (sponsorId) {

        announcements = await storage.getAnnouncementsBySponsor(sponsorId as string);

      } else {

        announcements = await storage.getAnnouncements();

      }



      res.json(announcements);

    } catch (error) {

      console.error("Error fetching announcements:", error);

      res.status(500).json({ message: "Failed to fetch announcements" });

    }

  });



  app.post('/api/announcements', isAdminAuthenticated, async (req: any, res) => {

    try {

      const validatedData = insertAnnouncementSchema.parse(req.body);

      const announcement = await storage.createAnnouncement(validatedData);

      res.json(announcement);

    } catch (error) {

      console.error("Error creating announcement:", error);

      res.status(500).json({ message: "Failed to create announcement" });

    }

  });



  // Register video & file upload routes

  registerVideoFileRoutes(app);



  // Exam routes

  app.get('/api/exams', isAdminAuthenticated, async (req, res) => {

    try {

      const { sponsorId } = req.query;

      const exams = await storage.getExams(sponsorId as string | undefined);

      res.json(exams);

    } catch (error) {

      console.error('Error fetching exams:', error);

      res.status(500).json({ message: 'Failed to fetch exams' });

    }

  });



  app.get('/api/exams/:id', isAdminAuthenticated, async (req, res) => {

    try {

      const exam = await storage.getExam(req.params.id);

      if (!exam) {

        return res.status(404).json({ message: 'Exam not found' });

      }

      res.json(exam);

    } catch (error) {

      console.error('Error fetching exam:', error);

      res.status(500).json({ message: 'Failed to fetch exam' });

    }

  });



  app.post('/api/exams', isAdminAuthenticated, async (req: any, res) => {

    try {

      const validatedData = insertExamSchema.parse(req.body);

      const exam = await storage.createExam(validatedData);

      res.status(201).json(exam);

    } catch (error) {

      if (error instanceof z.ZodError) {

        return res.status(400).json({ 

          message: 'Validation error', 

          errors: error.errors 

        });

      }

      console.error('Error creating exam:', error);

      res.status(500).json({ message: 'Failed to create exam' });

    }

  });



  app.put('/api/exams/:id', isAdminAuthenticated, async (req: any, res) => {

    try {

      const validatedData = insertExamSchema.partial().parse(req.body);

      const exam = await storage.updateExam(req.params.id, validatedData);

      res.json(exam);

    } catch (error) {

      if (error instanceof z.ZodError) {

        return res.status(400).json({ 

          message: 'Validation error', 

          errors: error.errors 

        });

      }

      console.error('Error updating exam:', error);

      res.status(500).json({ message: 'Failed to update exam' });

    }

  });



  app.delete('/api/exams/:id', isAdminAuthenticated, async (req, res) => {

    try {

      await storage.deleteExam(req.params.id);

      res.status(204).send();

    } catch (error) {

      console.error('Error deleting exam:', error);

      res.status(500).json({ message: 'Failed to delete exam' });

    }

  });



  // Exam question routes

  app.get('/api/exams/:examId/questions', isAdminAuthenticated, async (req, res) => {

    try {

      const questions = await storage.getExamQuestions(req.params.examId);

      res.json(questions);

    } catch (error) {

      console.error('Error fetching exam questions:', error);

      res.status(500).json({ message: 'Failed to fetch exam questions' });

    }

  });



  app.post('/api/exams/:examId/questions', isAdminAuthenticated, async (req: any, res) => {

    try {

      const validatedData = insertExamQuestionSchema.parse({

        ...req.body,

        examId: req.params.examId

      });

      const question = await storage.createExamQuestion(validatedData);

      res.status(201).json(question);

    } catch (error) {

      if (error instanceof z.ZodError) {

        return res.status(400).json({ 

          message: 'Validation error', 

          errors: error.errors 

        });

      }

      console.error('Error creating exam question:', error);

      res.status(500).json({ message: 'Failed to create exam question' });

    }

  });



  app.put('/api/questions/:id', isAdminAuthenticated, async (req: any, res) => {

    try {

      const validatedData = insertExamQuestionSchema.partial().parse(req.body);

      const question = await storage.updateExamQuestion(req.params.id, validatedData);

      res.json(question);

    } catch (error) {

      if (error instanceof z.ZodError) {

        return res.status(400).json({ 

          message: 'Validation error', 

          errors: error.errors 

        });

      }

      console.error('Error updating exam question:', error);

      res.status(500).json({ message: 'Failed to update exam question' });

    }

  });



  app.delete('/api/questions/:id', isAdminAuthenticated, async (req, res) => {

    try {

      await storage.deleteExamQuestion(req.params.id);

      res.status(204).send();

    } catch (error) {

      console.error('Error deleting exam question:', error);

      res.status(500).json({ message: 'Failed to delete exam question' });

    }

  });



  // Exam attempt routes

  app.get('/api/exam-attempts', isAdminAuthenticated, async (req, res) => {

    try {

      const { examId, traineeId } = req.query;

      const attempts = await storage.getExamAttempts(

        examId as string | undefined, 

        traineeId as string | undefined

      );

      res.json(attempts);

    } catch (error) {

      console.error('Error fetching exam attempts:', error);

      res.status(500).json({ message: 'Failed to fetch exam attempts' });

    }

  });



  app.post('/api/exams/:examId/start', async (req: any, res) => {

    try {

      const { traineeId } = req.body;

      if (!traineeId) {

        return res.status(400).json({ message: 'Trainee ID is required' });

      }

      const attempt = await storage.startExamAttempt(req.params.examId, traineeId);

      res.status(201).json(attempt);

    } catch (error) {

      console.error('Error starting exam attempt:', error);

      res.status(500).json({ message: 'Failed to start exam attempt' });

    }

  });



  app.post('/api/exam-attempts/:attemptId/submit', async (req: any, res) => {

    try {

      const { answers } = req.body;

      if (!Array.isArray(answers)) {

        return res.status(400).json({ message: 'Answers must be an array' });

      }

      const attempt = await storage.submitExamAttempt(req.params.attemptId, answers);

      res.json(attempt);

    } catch (error) {

      console.error('Error submitting exam attempt:', error);

      res.status(500).json({ message: 'Failed to submit exam attempt' });

    }

  });



  app.post('/api/exam-attempts/:attemptId/grade', isAdminAuthenticated, async (req, res) => {

    try {

      const attempt = await storage.gradeExamAttempt(req.params.attemptId);

      res.json(attempt);

    } catch (error) {

      console.error('Error grading exam attempt:', error);

      res.status(500).json({ message: 'Failed to grade exam attempt' });

    }

  });





  // Statistics routes

  app.get('/api/statistics', isAdminAuthenticated, async (req, res) => {

    try {

      const statistics = await storage.getStatistics();

      res.json(statistics);

    } catch (error) {

      console.error("Error fetching statistics:", error);

      res.status(500).json({ message: "Failed to fetch statistics" });

    }

  });



  const httpServer = createServer(app);

  return httpServer;

}



/* Duplicate block disabled
// Import exam-related schemas and dependencies



import { insertExamSchema, insertExamQuestionSchema } from "@shared/schema";
*/
