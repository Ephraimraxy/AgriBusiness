import {
  type User,
  type UpsertUser,
  type Sponsor,
  type InsertSponsor,
  type Trainee,
  type InsertTrainee,
  type Content,
  type InsertContent,
  type TraineeProgress,
  type Announcement,
  type InsertAnnouncement,
  type AnnouncementReply,
  type InsertAnnouncementReply,
  type SystemSetting,
  type Exam,
  type InsertExam,
  type ExamQuestion,
  type InsertExamQuestion,
  type ExamAttempt,
  type ExamAnswer,
  type Notification,
  type InsertNotification,
} from "@shared/schema";

// Local type definitions for staff and resource person
type Staff = any;
type ResourcePerson = any;
import { db } from "./firebase";
import { Timestamp } from "firebase-admin/firestore";

// In-memory fallback for password reset tokens (for when Firebase is unavailable)
const memoryTokens = new Map<string, { email: string; traineeId: string; expiry: Date }>();

// In-memory password reset token storage (server-side only)
const passwordResetTokens = new Map<string, { email: string; traineeId: string; expiry: Date }>();

export interface IStorage {
  // User operations - mandatory for Replit Auth
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getUsers(): Promise<User[]>;
  
  // Sponsor operations
  
  // Sponsor operations
  getSponsors(): Promise<Sponsor[]>;
  getSponsor(id: string): Promise<Sponsor | undefined>;
  createSponsor(sponsor: InsertSponsor): Promise<Sponsor>;
  updateSponsor(id: string, sponsor: Partial<InsertSponsor>): Promise<Sponsor>;
  getActiveSponsor(): Promise<Sponsor | undefined>;
  deactivateAllSponsors(): Promise<void>;
  deleteSponsor(id: string): Promise<void>;

  // Staff operations
  getStaffs(): Promise<Staff[]>;
  getStaffRegistrations(): Promise<Staff[]>;
  getResourcePersonRegistrations(): Promise<ResourcePerson[]>;
  getResourcePersons(): Promise<ResourcePerson[]>;
  
  // Trainee operations
  getTrainees(): Promise<Trainee[]>;
  getTraineesBySponsor(sponsorId: string): Promise<Trainee[]>;
  getTrainee(id: string): Promise<Trainee | undefined>;
  getTraineeByEmail(email: string): Promise<Trainee | undefined>;
  getTraineeByUserId(userId: string): Promise<Trainee | undefined>;
  createTrainee(trainee: InsertTrainee): Promise<Trainee>;
  updateTrainee(id: string, trainee: Partial<InsertTrainee>): Promise<Trainee>;
  verifyTraineeEmail(email: string, code: string): Promise<boolean>;
  
  // Content operations
  getContent(): Promise<Content[]>;
  getContentBySponsor(sponsorId: string): Promise<Content[]>;
  createContent(content: InsertContent): Promise<Content>;
  updateContent(id: string, content: Partial<InsertContent>): Promise<Content>;
  
  // Progress operations
  getTraineeProgress(traineeId: string): Promise<TraineeProgress[]>;
  updateProgress(traineeId: string, contentId: string, progress: Partial<TraineeProgress>): Promise<TraineeProgress>;
  
  // Announcement operations
  getAnnouncements(): Promise<Announcement[]>;
  getAnnouncementsBySponsor(sponsorId: string): Promise<Announcement[]>;
  createAnnouncement(announcement: InsertAnnouncement, adminUser?: any): Promise<Announcement>;
  updateAnnouncement(id: string, announcement: Partial<InsertAnnouncement>): Promise<Announcement>;
  deleteAnnouncement(id: string): Promise<void>;
  
  // Announcement Reply operations
  getAnnouncementReplies(announcementId: string): Promise<AnnouncementReply[]>;
  createAnnouncementReply(reply: InsertAnnouncementReply, user: any): Promise<AnnouncementReply>;
  
  // Notifications
  createNotification(notification: InsertNotification): Promise<Notification>;
  getNotifications(userId: string): Promise<Notification[]>;
  markNotificationAsRead(notificationId: string): Promise<void>;
  
  // System settings
  getSystemSetting(key: string): Promise<SystemSetting | undefined>;
  updateSystemSetting(key: string, value: string): Promise<SystemSetting>;
  
  // Statistics
  getStatistics(): Promise<{
    totalTrainees: number;
    activeSponsors: number;
    completedCourses: number;
    activeContent: number;
    totalExams: number;
  }>;
  
  // Exam operations
  createExam(exam: InsertExam): Promise<Exam>;
  getExams(): Promise<Exam[]>;
  getExam(id: string): Promise<Exam | undefined>;
  updateExam(id: string, exam: Partial<InsertExam>): Promise<Exam>;
  deleteExam(id: string): Promise<void>;
  
  // Exam Question operations
  createExamQuestion(question: InsertExamQuestion): Promise<ExamQuestion>;
  getExamQuestions(examId: string): Promise<ExamQuestion[]>;
  getExamQuestion(id: string): Promise<ExamQuestion | undefined>;
  updateExamQuestion(id: string, question: Partial<InsertExamQuestion>): Promise<ExamQuestion>;
  deleteExamQuestion(id: string): Promise<void>;
  
  // Password Reset Token operations
  createPasswordResetToken(token: string, email: string, traineeId: string, expiry: Date): Promise<void>;
  getPasswordResetToken(token: string): Promise<{ email: string; traineeId: string; expiry: Date } | undefined>;
  deletePasswordResetToken(token: string): Promise<void>;
  cleanupExpiredPasswordResetTokens(): Promise<void>;
  
  // Exam Attempt operations
  createExamAttempt(attempt: ExamAttempt): Promise<ExamAttempt>;
  getExamAttempts(traineeId: string): Promise<ExamAttempt[]>;
  getExamAttempt(id: string): Promise<ExamAttempt | undefined>;
  updateExamAttempt(id: string, attempt: Partial<ExamAttempt>): Promise<ExamAttempt>;
  
  // Exam Answer operations
  createExamAnswer(answer: ExamAnswer): Promise<ExamAnswer>;
  getExamAnswers(attemptId: string): Promise<ExamAnswer[]>;
  updateExamAnswer(id: string, answer: Partial<ExamAnswer>): Promise<ExamAnswer>;
}

export class FirebaseStorage implements IStorage {
  private convertTimestamps<T>(obj: any): T {
    if (!obj) return obj;
    
    const converted = { ...obj };
    for (const [key, value] of Object.entries(converted)) {
      if (value instanceof Timestamp) {
        converted[key] = value.toDate();
      } else if (value && typeof value === 'object' && !Array.isArray(value)) {
        converted[key] = this.convertTimestamps(value);
      }
    }
    return converted;
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const userDoc = await db.collection('users').doc(id).get();
    if (userDoc.exists) {
      return this.convertTimestamps({ id: userDoc.id, ...userDoc.data() }) as User;
    }
    return undefined;
  }

  async upsertUser(user: UpsertUser): Promise<User> {
    const userRef = db.collection('users').doc(user.id);
    const userToSave = {
      ...user,
      updatedAt: new Date(),
    };

    const userDoc = await userRef.get();
    if (userDoc.exists) {
      await userRef.update(userToSave);
    } else {
      await userRef.set(userToSave);
    }
    return userToSave as User;
  }

  async getUsers(): Promise<User[]> {
    const snapshot = await db.collection('users').orderBy('createdAt', 'desc').get();
    return snapshot.docs.map(doc => 
      this.convertTimestamps({ id: doc.id, ...doc.data() }) as User
    );
  }

  // Sponsor operations
  async getSponsors(): Promise<Sponsor[]> {
    const snapshot = await db.collection('sponsors').orderBy('createdAt', 'desc').get();
    return snapshot.docs.map(doc => 
      this.convertTimestamps({ id: doc.id, ...doc.data() }) as Sponsor
    );
  }

  async getSponsor(id: string): Promise<Sponsor | undefined> {
    const sponsorDoc = await db.collection('sponsors').doc(id).get();
    if (sponsorDoc.exists) {
      return this.convertTimestamps({ id: sponsorDoc.id, ...sponsorDoc.data() }) as Sponsor;
    }
    return undefined;
  }

  async createSponsor(sponsor: InsertSponsor): Promise<Sponsor> {
    const now = new Date();
    const sponsorData = {
      ...sponsor,
      createdAt: now,
      updatedAt: now,
    };
    
    const docRef = await db.collection('sponsors').add(sponsorData);
    return { id: docRef.id, ...sponsorData } as Sponsor;
  }

  async updateSponsor(id: string, sponsor: Partial<InsertSponsor>): Promise<Sponsor> {
    const sponsorRef = db.collection('sponsors').doc(id);
    const updateData = {
      ...sponsor,
      updatedAt: new Date(),
    };
    
    await sponsorRef.update(updateData);
    const updatedDoc = await sponsorRef.get();
    return this.convertTimestamps({ id: updatedDoc.id, ...updatedDoc.data() }) as Sponsor;
  }

  async getActiveSponsor(): Promise<Sponsor | undefined> {
    const snapshot = await db.collection('sponsors')
      .where('isActive', '==', true)
      .limit(1)
      .get();
    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      return this.convertTimestamps({ id: doc.id, ...doc.data() }) as Sponsor;
    }
    return undefined;
  }

  // Deactivate all sponsors (sets isActive=false on all documents)
  async deactivateAllSponsors(): Promise<void> {
    const snapshot = await db.collection('sponsors').get();
    const now = new Date();
    const batch = db.batch();
    
    snapshot.docs.forEach((docSnap) => {
      const docRef = db.collection('sponsors').doc(docSnap.id);
      batch.update(docRef, {
        isActive: false,
        updatedAt: now,
      });
    });
    
    await batch.commit();
  }

  // Delete sponsor by id
  async deleteSponsor(id: string): Promise<void> {
    await db.collection('sponsors').doc(id).delete();
  }

  // Staff operations
  async getStaffs(): Promise<Staff[]> {
    const snapshot = await db.collection('staffs').orderBy('createdAt', 'desc').get();
    return snapshot.docs.map(doc => 
      this.convertTimestamps({ id: doc.id, ...doc.data() }) as Staff
    );
  }

  async getStaffRegistrations(): Promise<Staff[]> {
    const snapshot = await db.collection('staff_registrations').orderBy('createdAt', 'desc').get();
    return snapshot.docs.map(doc => 
      this.convertTimestamps({ id: doc.id, ...doc.data() }) as Staff
    );
  }

  async getResourcePersonRegistrations(): Promise<ResourcePerson[]> {
    const snapshot = await db.collection('resource_person_registrations').orderBy('createdAt', 'desc').get();
    return snapshot.docs.map(doc => 
      this.convertTimestamps({ id: doc.id, ...doc.data() }) as ResourcePerson
    );
  }

  async getResourcePersons(): Promise<ResourcePerson[]> {
    const snapshot = await db.collection('resource_persons').orderBy('createdAt', 'desc').get();
    return snapshot.docs.map(doc => 
      this.convertTimestamps({ id: doc.id, ...doc.data() }) as ResourcePerson
    );
  }

  // Trainee operations
  async getTrainees(): Promise<Trainee[]> {
    const snapshot = await db.collection('trainees').orderBy('createdAt', 'desc').get();
    return snapshot.docs.map(doc => 
      this.convertTimestamps({ id: doc.id, ...doc.data() }) as Trainee
    );
  }

  async getTraineesBySponsor(sponsorId: string): Promise<Trainee[]> {
    const snapshot = await db.collection('trainees')
      .where('sponsorId', '==', sponsorId)
      .orderBy('createdAt', 'desc')
      .get();
    return snapshot.docs.map(doc => 
      this.convertTimestamps({ id: doc.id, ...doc.data() }) as Trainee
    );
  }

  async getTrainee(id: string): Promise<Trainee | undefined> {
    const traineeDoc = await db.collection('trainees').doc(id).get();
    if (traineeDoc.exists) {
      return this.convertTimestamps({ id: traineeDoc.id, ...traineeDoc.data() }) as Trainee;
    }
    return undefined;
  }

  async getTraineeByEmail(email: string): Promise<Trainee | undefined> {
    const snapshot = await db.collection('trainees')
      .where('email', '==', email)
      .limit(1)
      .get();
    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      return this.convertTimestamps({ id: doc.id, ...doc.data() }) as Trainee;
    }
    return undefined;
  }

  async getTraineeByUserId(userId: string): Promise<Trainee | undefined> {
    const snapshot = await db.collection('trainees')
      .where('userId', '==', userId)
      .limit(1)
      .get();
    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      return this.convertTimestamps({ id: doc.id, ...doc.data() }) as Trainee;
    }
    return undefined;
  }

  async createTrainee(trainee: InsertTrainee): Promise<Trainee> {
    const now = new Date();
    const traineeData = {
      ...trainee,
      createdAt: now,
      updatedAt: now,
    };
    
    const docRef = await db.collection('trainees').add(traineeData);
    return { id: docRef.id, ...traineeData } as Trainee;
  }

  async updateTrainee(id: string, trainee: Partial<InsertTrainee>): Promise<Trainee> {
    const traineeRef = db.collection('trainees').doc(id);
    const updateData = {
      ...trainee,
      updatedAt: new Date(),
    };
    
    await traineeRef.update(updateData);
    const updatedDoc = await traineeRef.get();
    return this.convertTimestamps({ id: updatedDoc.id, ...updatedDoc.data() }) as Trainee;
  }

  async verifyTraineeEmail(email: string, code: string): Promise<boolean> {
    const snapshot = await db.collection('trainees')
      .where('email', '==', email)
      .where('verificationCode', '==', code)
      .limit(1)
      .get();
    
    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      await db.collection('trainees').doc(doc.id).update({
        isEmailVerified: true,
        verificationCode: null,
        updatedAt: new Date(),
      });
      return true;
    }
    return false;
  }

  // Content operations
  async getContent(): Promise<Content[]> {
    const snapshot = await db.collection('content').orderBy('createdAt', 'desc').get();
    return snapshot.docs.map(doc => 
      this.convertTimestamps({ id: doc.id, ...doc.data() }) as Content
    );
  }

  async getContentBySponsor(sponsorId: string): Promise<Content[]> {
    const snapshot = await db.collection('content')
      .where('sponsorId', '==', sponsorId)
      .orderBy('createdAt', 'desc')
      .get();
    return snapshot.docs.map(doc => 
      this.convertTimestamps({ id: doc.id, ...doc.data() }) as Content
    );
  }

  async createContent(content: InsertContent): Promise<Content> {
    const now = new Date();
    const contentData = {
      ...content,
      createdAt: now,
      updatedAt: now,
    };
    
    const docRef = await db.collection('content').add(contentData);
    return { id: docRef.id, ...contentData } as Content;
  }

  async updateContent(id: string, content: Partial<InsertContent>): Promise<Content> {
    const contentRef = db.collection('content').doc(id);
    const updateData = {
      ...content,
      updatedAt: new Date(),
    };
    
    await contentRef.update(updateData);
    const updatedDoc = await contentRef.get();
    return this.convertTimestamps({ id: updatedDoc.id, ...updatedDoc.data() }) as Content;
  }

  // Progress operations
  async getTraineeProgress(traineeId: string): Promise<TraineeProgress[]> {
    const snapshot = await db.collection('traineeProgress')
      .where('traineeId', '==', traineeId)
      .orderBy('updatedAt', 'desc')
      .get();
    return snapshot.docs.map(doc => 
      this.convertTimestamps({ id: doc.id, ...doc.data() }) as TraineeProgress
    );
  }

  async updateProgress(traineeId: string, contentId: string, progress: Partial<TraineeProgress>): Promise<TraineeProgress> {
    const progressRef = db.collection('traineeProgress').doc(`${traineeId}_${contentId}`);
    const updateData = {
      ...progress,
      traineeId,
      contentId,
      updatedAt: new Date(),
    };
    
    await progressRef.set(updateData, { merge: true });
    const updatedDoc = await progressRef.get();
    return this.convertTimestamps({ id: updatedDoc.id, ...updatedDoc.data() }) as TraineeProgress;
  }

  // Announcement operations
  async getAnnouncements(): Promise<Announcement[]> {
    const snapshot = await db.collection('announcements').orderBy('createdAt', 'desc').get();
    return snapshot.docs.map(doc => 
      this.convertTimestamps({ id: doc.id, ...doc.data() }) as Announcement
    );
  }

  async getAnnouncementsBySponsor(sponsorId: string): Promise<Announcement[]> {
    const snapshot = await db.collection('announcements')
      .where('sponsorId', '==', sponsorId)
      .orderBy('createdAt', 'desc')
      .get();
    return snapshot.docs.map(doc => 
      this.convertTimestamps({ id: doc.id, ...doc.data() }) as Announcement
    );
  }

  async createAnnouncement(announcement: InsertAnnouncement, adminUser?: any): Promise<Announcement> {
    const now = new Date();
    const announcementData = {
      ...announcement,
      createdAt: now,
      updatedAt: now,
      createdBy: adminUser?.id || 'system',
    };
    
    const docRef = await db.collection('announcements').add(announcementData);
    return { id: docRef.id, ...announcementData } as Announcement;
  }

  async updateAnnouncement(id: string, announcement: Partial<InsertAnnouncement>): Promise<Announcement> {
    const announcementRef = db.collection('announcements').doc(id);
    const updateData = {
      ...announcement,
      updatedAt: new Date(),
    };
    
    await announcementRef.update(updateData);
    const updatedDoc = await announcementRef.get();
    return this.convertTimestamps({ id: updatedDoc.id, ...updatedDoc.data() }) as Announcement;
  }

  async deleteAnnouncement(id: string): Promise<void> {
    await db.collection('announcements').doc(id).delete();
  }

  // Announcement Reply operations
  async getAnnouncementReplies(announcementId: string): Promise<AnnouncementReply[]> {
    const snapshot = await db.collection('announcementReplies')
      .where('announcementId', '==', announcementId)
      .orderBy('createdAt', 'asc')
      .get();
    return snapshot.docs.map(doc => 
      this.convertTimestamps({ id: doc.id, ...doc.data() }) as AnnouncementReply
    );
  }

  async createAnnouncementReply(reply: InsertAnnouncementReply, user: any): Promise<AnnouncementReply> {
    const now = new Date();
    const replyData = {
      ...reply,
      createdAt: now,
      updatedAt: now,
      createdBy: user?.id || 'anonymous',
    };
    
    const docRef = await db.collection('announcementReplies').add(replyData);
    return { id: docRef.id, ...replyData } as AnnouncementReply;
  }

  // Notifications
  async createNotification(notification: InsertNotification): Promise<Notification> {
    const now = new Date();
    const notificationData = {
      ...notification,
      createdAt: now,
      updatedAt: now,
    };
    
    const docRef = await db.collection('notifications').add(notificationData);
    return { id: docRef.id, ...notificationData } as Notification;
  }

  async getNotifications(userId: string): Promise<Notification[]> {
    const snapshot = await db.collection('notifications')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();
    return snapshot.docs.map(doc => 
      this.convertTimestamps({ id: doc.id, ...doc.data() }) as Notification
    );
  }

  async markNotificationAsRead(notificationId: string): Promise<void> {
    await db.collection('notifications').doc(notificationId).update({
      isRead: true,
      updatedAt: new Date(),
    });
  }

  // System settings
  async getSystemSetting(key: string): Promise<SystemSetting | undefined> {
    const settingDoc = await db.collection('systemSettings').doc(key).get();
    if (settingDoc.exists) {
      return this.convertTimestamps({ id: settingDoc.id, ...settingDoc.data() }) as SystemSetting;
    }
    return undefined;
  }

  async updateSystemSetting(key: string, value: string): Promise<SystemSetting> {
    const settingRef = db.collection('systemSettings').doc(key);
    const settingData = {
      key,
      value,
      updatedAt: new Date(),
    };
    
    await settingRef.set(settingData, { merge: true });
    const updatedDoc = await settingRef.get();
    return this.convertTimestamps({ id: updatedDoc.id, ...updatedDoc.data() }) as SystemSetting;
  }

  // Statistics
  async getStatistics(): Promise<{
    totalTrainees: number;
    activeSponsors: number;
    completedCourses: number;
    activeContent: number;
    totalExams: number;
  }> {
    const [traineesSnapshot, sponsorsSnapshot, contentSnapshot, examsSnapshot] = await Promise.all([
      db.collection('trainees').get(),
      db.collection('sponsors').where('isActive', '==', true).get(),
      db.collection('content').get(),
      db.collection('exams').get(),
    ]);

    return {
      totalTrainees: traineesSnapshot.size,
      activeSponsors: sponsorsSnapshot.size,
      completedCourses: 0, // TODO: Implement completion tracking
      activeContent: contentSnapshot.size,
      totalExams: examsSnapshot.size,
    };
  }

  // Exam operations
  async createExam(exam: InsertExam): Promise<Exam> {
    const now = new Date();
    const examData = {
      ...exam,
      createdAt: now,
      updatedAt: now,
    };
    
    const docRef = await db.collection('exams').add(examData);
    return { id: docRef.id, ...examData } as Exam;
  }

  async getExams(): Promise<Exam[]> {
    const snapshot = await db.collection('exams').orderBy('createdAt', 'desc').get();
    return snapshot.docs.map(doc => 
      this.convertTimestamps({ id: doc.id, ...doc.data() }) as Exam
    );
  }

  async getExam(id: string): Promise<Exam | undefined> {
    const examDoc = await db.collection('exams').doc(id).get();
    if (examDoc.exists) {
      return this.convertTimestamps({ id: examDoc.id, ...examDoc.data() }) as Exam;
    }
    return undefined;
  }

  async updateExam(id: string, exam: Partial<InsertExam>): Promise<Exam> {
    const examRef = db.collection('exams').doc(id);
    const updateData = {
      ...exam,
      updatedAt: new Date(),
    };
    
    await examRef.update(updateData);
    const updatedDoc = await examRef.get();
    return this.convertTimestamps({ id: updatedDoc.id, ...updatedDoc.data() }) as Exam;
  }

  async deleteExam(id: string): Promise<void> {
    // First delete all questions for this exam
    await this.deleteExamQuestions(id);
    // Then delete the exam itself
    await db.collection('exams').doc(id).delete();
  }

  // Exam Question operations
  async createExamQuestion(question: InsertExamQuestion): Promise<ExamQuestion> {
    const now = new Date();
    const questionData = {
      ...question,
      createdAt: now,
      updatedAt: now,
    };
    
    const docRef = await db.collection('examQuestions').add(questionData);
    return { id: docRef.id, ...questionData } as ExamQuestion;
  }

  async getExamQuestions(examId: string): Promise<ExamQuestion[]> {
    const snapshot = await db.collection('examQuestions')
      .where('examId', '==', examId)
      .orderBy('order', 'asc')
      .get();
    return snapshot.docs.map(doc => 
      this.convertTimestamps({ id: doc.id, ...doc.data() }) as ExamQuestion
    );
  }

  async getExamQuestion(id: string): Promise<ExamQuestion | undefined> {
    const questionDoc = await db.collection('examQuestions').doc(id).get();
    if (questionDoc.exists) {
      return this.convertTimestamps({ id: questionDoc.id, ...questionDoc.data() }) as ExamQuestion;
    }
    return undefined;
  }

  async updateExamQuestion(id: string, question: Partial<InsertExamQuestion>): Promise<ExamQuestion> {
    const questionRef = db.collection('examQuestions').doc(id);
    const updateData = {
      ...question,
      updatedAt: new Date(),
    };
    
    await questionRef.update(updateData);
    const updatedDoc = await questionRef.get();
    return this.convertTimestamps({ id: updatedDoc.id, ...updatedDoc.data() }) as ExamQuestion;
  }

  async deleteExamQuestion(id: string): Promise<void> {
    await db.collection('examQuestions').doc(id).delete();
  }

  // Exam Attempt operations
  async createExamAttempt(attempt: ExamAttempt): Promise<ExamAttempt> {
    const now = new Date();
    const attemptData = {
      ...attempt,
      createdAt: now,
      updatedAt: now,
    };
    
    const docRef = await db.collection('examAttempts').add(attemptData);
    return { id: docRef.id, ...attemptData } as ExamAttempt;
  }

  async getExamAttempts(traineeId: string): Promise<ExamAttempt[]> {
    const snapshot = await db.collection('examAttempts')
      .where('traineeId', '==', traineeId)
      .orderBy('createdAt', 'desc')
      .get();
    return snapshot.docs.map(doc => 
      this.convertTimestamps({ id: doc.id, ...doc.data() }) as ExamAttempt
    );
  }

  async getExamAttempt(id: string): Promise<ExamAttempt | undefined> {
    const attemptDoc = await db.collection('examAttempts').doc(id).get();
    if (attemptDoc.exists) {
      return this.convertTimestamps({ id: attemptDoc.id, ...attemptDoc.data() }) as ExamAttempt;
    }
    return undefined;
  }

  async updateExamAttempt(id: string, attempt: Partial<ExamAttempt>): Promise<ExamAttempt> {
    const attemptRef = db.collection('examAttempts').doc(id);
    const updateData = {
      ...attempt,
      updatedAt: new Date(),
    };
    
    await attemptRef.update(updateData);
    const updatedDoc = await attemptRef.get();
    return this.convertTimestamps({ id: updatedDoc.id, ...updatedDoc.data() }) as ExamAttempt;
  }

  // Exam Answer operations
  async createExamAnswer(answer: ExamAnswer): Promise<ExamAnswer> {
    const now = new Date();
    const answerData = {
      ...answer,
      createdAt: now,
      updatedAt: now,
    };
    
    const docRef = await db.collection('examAnswers').add(answerData);
    return { id: docRef.id, ...answerData } as ExamAnswer;
  }

  async getExamAnswers(attemptId: string): Promise<ExamAnswer[]> {
    const snapshot = await db.collection('examAnswers')
      .where('attemptId', '==', attemptId)
      .orderBy('createdAt', 'asc')
      .get();
    return snapshot.docs.map(doc => 
      this.convertTimestamps({ id: doc.id, ...doc.data() }) as ExamAnswer
    );
  }

  async updateExamAnswer(id: string, answer: Partial<ExamAnswer>): Promise<ExamAnswer> {
    const answerRef = db.collection('examAnswers').doc(id);
    const updateData = {
      ...answer,
      updatedAt: new Date(),
    };
    
    await answerRef.update(updateData);
    const updatedDoc = await answerRef.get();
    return this.convertTimestamps({ id: updatedDoc.id, ...updatedDoc.data() }) as ExamAnswer;
  }

  // Password Reset Token operations
  async createPasswordResetToken(token: string, email: string, traineeId: string, expiry: Date): Promise<void> {
    try {
      console.log('[STORAGE DEBUG] Creating password reset token:', { token, email, traineeId, expiry });
      
      // Store token in memory (server-side only)
      passwordResetTokens.set(token, { email, traineeId, expiry });
      console.log('[STORAGE DEBUG] Password reset token stored in memory successfully');
      
      // Also try to store in Firebase as backup (but don't fail if it doesn't work)
      try {
        const tokenData = {
          email,
          traineeId,
          expiry: Timestamp.fromDate(expiry),
          createdAt: Timestamp.fromDate(new Date()),
        };
        
        await db.collection('passwordResetTokens').doc(token).set(tokenData);
        console.log('[STORAGE DEBUG] Password reset token also stored in Firebase successfully');
      } catch (firebaseError) {
        console.error('[STORAGE WARNING] Failed to store token in Firebase, but memory storage succeeded:', firebaseError);
      }
    } catch (error) {
      console.error('[STORAGE ERROR] Failed to create password reset token:', error);
      throw error;
    }
  }

  async getPasswordResetToken(token: string): Promise<{ email: string; traineeId: string; expiry: Date } | undefined> {
    try {
      console.log('[STORAGE DEBUG] Getting password reset token:', token);
      
      // Try memory first (fastest)
      const memoryToken = passwordResetTokens.get(token);
      if (memoryToken) {
        console.log('[STORAGE DEBUG] Token found in memory');
        return memoryToken;
      }
      
      // Fallback to Firebase
      try {
        const tokenDoc = await db.collection('passwordResetTokens').doc(token).get();
        console.log('[STORAGE DEBUG] Token document exists in Firebase:', tokenDoc.exists);
        
        if (tokenDoc.exists) {
          const data = tokenDoc.data();
          console.log('[STORAGE DEBUG] Token data found in Firebase:', { email: data!.email, traineeId: data!.traineeId });
          
          const tokenData = {
            email: data!.email,
            traineeId: data!.traineeId,
            expiry: data!.expiry.toDate(),
          };
          
          // Store in memory for future fast access
          passwordResetTokens.set(token, tokenData);
          
          return tokenData;
        }
      } catch (firebaseError) {
        console.error('[STORAGE WARNING] Failed to get token from Firebase:', firebaseError);
      }
      
      console.log('[STORAGE DEBUG] Token not found in memory or Firebase');
      return undefined;
    } catch (error) {
      console.error('[STORAGE ERROR] Failed to get password reset token:', error);
      return undefined;
    }
  }

  async deletePasswordResetToken(token: string): Promise<void> {
    try {
      console.log('[STORAGE DEBUG] Deleting password reset token:', token);
      
      // Remove from memory
      passwordResetTokens.delete(token);
      console.log('[STORAGE DEBUG] Password reset token deleted from memory');
      
      // Also try to delete from Firebase (but don't fail if it doesn't work)
      try {
        await db.collection('passwordResetTokens').doc(token).delete();
        console.log('[STORAGE DEBUG] Password reset token also deleted from Firebase');
      } catch (firebaseError) {
        console.error('[STORAGE WARNING] Failed to delete token from Firebase:', firebaseError);
      }
    } catch (error) {
      console.error('[STORAGE ERROR] Failed to delete password reset token:', error);
    }
  }

  async cleanupExpiredPasswordResetTokens(): Promise<void> {
    try {
      console.log('[STORAGE DEBUG] Cleaning up expired password reset tokens');
      
      // Clean up memory tokens
      const now = new Date();
      let memoryCleaned = 0;
      for (const [token, data] of passwordResetTokens.entries()) {
        if (data.expiry < now) {
          passwordResetTokens.delete(token);
          memoryCleaned++;
        }
      }
      console.log(`[PASSWORD RESET] Cleaned up ${memoryCleaned} expired memory tokens`);
      
      // Also try to clean up Firebase (but don't fail if it doesn't work)
      try {
        const firebaseNow = Timestamp.fromDate(now);
        const snapshot = await db.collection('passwordResetTokens')
          .where('expiry', '<', firebaseNow)
          .get();
        
        const batch = db.batch();
        snapshot.docs.forEach(doc => {
          batch.delete(doc.ref);
        });
        
        if (snapshot.docs.length > 0) {
          await batch.commit();
          console.log(`[PASSWORD RESET] Cleaned up ${snapshot.docs.length} expired tokens from Firebase`);
        }
      } catch (firebaseError) {
        console.error('[STORAGE WARNING] Failed to cleanup expired tokens from Firebase:', firebaseError);
      }
    } catch (error) {
      console.error('[STORAGE ERROR] Failed to cleanup expired tokens:', error);
    }
  }
}

export const storage = new FirebaseStorage();
