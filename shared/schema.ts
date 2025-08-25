import { z } from "zod";

// Firestore-based schema types

// User type - mandatory for Replit Auth
export type User = {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  role: "admin" | "trainee";
  createdAt: Date;
  updatedAt: Date;
};

// UpsertUser type for user creation/update
export type UpsertUser = Omit<User, 'createdAt' | 'updatedAt'>;

// Sponsor type
export type Sponsor = {
  id: string;
  name: string;
  description?: string;
  logoUrl?: string;
  startDate?: Date;
  endDate?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

// Trainee type
export type Trainee = {
  id: string;
  userId?: string;
  traineeId: string; // Auto-generated unique ID
  tagNumber: string; // e.g., FAMS-0091
  firstName: string;
  lastName: string;
  middleName?: string;
  email: string;
  phoneNumber: string;
  gender: "male" | "female" | "other";
  dateOfBirth: Date;
  stateOfOrigin: string;
  localGovernmentArea: string;
  nationality: string;
  passportPhotoUrl?: string;
  
  // Auto-assigned fields
  sponsorId?: string;
  roomNumber: string;
  lectureVenue: string;
  mealVenue: string;
  
  isActive: boolean;
  emailVerified: boolean;
  verificationCode?: string;
  verificationCodeExpiry?: Date;
  
  createdAt: Date;
  updatedAt: Date;
};

// Content type for videos, quizzes, assignments
export type Content = {
  id: string;
  title: string;
  description?: string;
  type: "video" | "quiz" | "assignment";
  contentUrl?: string;
  contentData?: any; // Store quiz questions, assignment details, etc.
  sponsorId?: string;
  dueDate?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

// Trainee progress tracking
export type TraineeProgress = {
  id: string;
  traineeId: string;
  contentId: string;
  status: "not_started" | "in_progress" | "completed";
  score?: number;
  submissionUrl?: string;
  submissionData?: any;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};

// Announcements type
export type Announcement = {
  id: string;
  title: string;
  message: string;
  from: string; // Sender name
  sponsorId?: string; // null for global announcements
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

// Announcement Reply type
export type AnnouncementReply = {
  id: string;
  announcementId: string;
  message: string;
  from: string; // Reply sender name
  fromId: string; // Reply sender user ID
  fromRole: 'admin' | 'trainee';
  replyToId?: string; // ID of the reply this is responding to (for admin replies to trainees)
  createdAt: Date;
};

// System settings type
export type SystemSetting = {
  id: string;
  key: string;
  value: string;
  updatedAt: Date;
};

// Exam types
export type Exam = {
  id: string;
  title: string;
  description?: string;
  duration: number; // in minutes
  isActive: boolean;
  sponsorId?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type ExamQuestion = {
  id: string;
  examId: string;
  questionText: string;
  questionType: 'mcq' | 'true_false' | 'fill_blank';
  options?: string[]; // For MCQ
  correctAnswer: string;
  points: number;
  orderIndex: number;
  createdAt: Date;
  updatedAt: Date;
};

export type ExamAttempt = {
  id: string;
  examId: string;
  traineeId: string;
  startTime: Date;
  endTime?: Date;
  score?: number;
  status: 'in_progress' | 'submitted' | 'graded';
  createdAt: Date;
  updatedAt: Date;
};

export type ExamAnswer = {
  id: string;
  attemptId: string;
  questionId: string;
  answer: string;
  isCorrect?: boolean;
  pointsAwarded?: number;
  createdAt: Date;
  updatedAt: Date;
};

// Zod schemas for validation
export const insertExamSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  duration: z.number().min(1, "Duration must be at least 1 minute"),
  isActive: z.boolean().default(true),
  sponsorId: z.string().optional(),
});

export const insertExamQuestionSchema = z.object({
  examId: z.string(),
  questionText: z.string().min(1, "Question text is required"),
  questionType: z.enum(['mcq', 'true_false', 'fill_blank']),
  options: z.array(z.string()).optional(),
  correctAnswer: z.string().min(1, "Correct answer is required"),
  points: z.number().min(0, "Points cannot be negative"),
  orderIndex: z.number().min(0, "Order index cannot be negative"),
});

// Zod schemas for validation
export const insertSponsorSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  logoUrl: z.string().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  isActive: z.boolean().default(true),
});

export const insertTraineeSchema = z.object({
  userId: z.string().optional(),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  middleName: z.string().optional(),
  email: z.string().email("Invalid email address"),
  phoneNumber: z.string().min(10, "Phone number is required"),
  gender: z.enum(["male", "female", "other"]),
  dateOfBirth: z.date(),
  stateOfOrigin: z.string().min(1, "State of origin is required"),
  localGovernmentArea: z.string().min(1, "Local government area is required"),
  nationality: z.string().default("Nigerian"),
  passportPhotoUrl: z.string().optional(),
  sponsorId: z.string().optional(),
  isActive: z.boolean().default(true),
  emailVerified: z.boolean().default(false),
  verificationCode: z.string().optional(),
  verificationCodeExpiry: z.date().optional(),
});

export const insertContentSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  type: z.enum(["video", "quiz", "assignment"]),
  contentUrl: z.string().optional(),
  contentData: z.any().optional(),
  sponsorId: z.string().optional(),
  dueDate: z.date().optional(),
  isActive: z.boolean().default(true),
});

export const insertAnnouncementSchema = z.object({
  title: z.string().min(1, "Title is required"),
  message: z.string().min(1, "Message is required"),
  sponsorId: z.string().optional(),
  isActive: z.boolean().default(true),
});

export const insertAnnouncementReplySchema = z.object({
  announcementId: z.string().min(1, "Announcement ID is required"),
  message: z.string().min(1, "Reply message is required"),
  replyToId: z.string().optional(), // ID of the reply this is responding to
});

// Types
export type InsertSponsor = z.infer<typeof insertSponsorSchema>;
export type InsertTrainee = z.infer<typeof insertTraineeSchema>;
export type InsertContent = z.infer<typeof insertContentSchema>;
export type InsertAnnouncement = z.infer<typeof insertAnnouncementSchema>;

// Message types for trainee-RP communication
export type Message = {
  id: string;
  fromId: string; // Trainee ID
  fromName: string; // Trainee name
  fromEmail: string; // Trainee email
  fromTagNumber: string; // Trainee tag number
  fromRoom?: string; // Trainee room assignment
  toId: string; // Resource Person ID
  toName: string; // Resource Person name
  toEmail: string; // Resource Person email
  subject: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
  // Additional metadata
  traineeSponsorId?: string; // Trainee's sponsor ID
  messageType: 'trainee_to_rp' | 'rp_to_trainee' | 'admin_broadcast';
  priority: 'low' | 'normal' | 'high' | 'urgent';
};

export type InsertMessage = Omit<Message, 'id' | 'createdAt'>;

export const insertMessageSchema = z.object({
  fromId: z.string().min(1, "From ID is required"),
  fromName: z.string().min(1, "From name is required"),
  fromEmail: z.string().email("Valid email is required"),
  fromTagNumber: z.string().min(1, "Tag number is required"),
  fromRoom: z.string().optional(),
  toId: z.string().min(1, "To ID is required"),
  toName: z.string().min(1, "To name is required"),
  toEmail: z.string().email("Valid email is required"),
  subject: z.string().min(1, "Subject is required"),
  message: z.string().min(1, "Message is required"),
  isRead: z.boolean().default(false),
  traineeSponsorId: z.string().optional(),
  messageType: z.enum(['trainee_to_rp', 'rp_to_trainee', 'admin_broadcast']).default('trainee_to_rp'),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
});

// Extended notification type to include messages
export type Notification = {
  id: string;
  userId: string; // Target user ID (trainee or RP)
  type: 'admin_reply' | 'announcement' | 'message';
  title: string;
  message: string;
  announcementId?: string;
  replyId?: string; // ID of the reply that triggered this notification
  messageId?: string; // ID of the message that triggered this notification
  fromId: string; // Admin who sent the reply or trainee who sent the message
  fromName: string; // Admin name or trainee name
  isRead: boolean;
  createdAt: Date;
};

export type InsertNotification = Omit<Notification, 'id' | 'createdAt'>;

export const insertNotificationSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  type: z.enum(['admin_reply', 'announcement', 'message']),
  title: z.string().min(1, "Title is required"),
  message: z.string().min(1, "Message is required"),
  announcementId: z.string().optional(),
  replyId: z.string().optional(),
  messageId: z.string().optional(),
  fromId: z.string().min(1, "From ID is required"),
  fromName: z.string().min(1, "From name is required"),
  isRead: z.boolean().default(false),
});

export type InsertAnnouncementReply = z.infer<typeof insertAnnouncementReplySchema>;
export type InsertExam = z.infer<typeof insertExamSchema>;
export type InsertExamQuestion = z.infer<typeof insertExamQuestionSchema>;
