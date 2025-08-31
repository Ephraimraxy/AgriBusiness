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
import { db } from "./firebase";
import { Timestamp } from "firebase-admin/firestore";

export interface IStorage {
  // User operations - mandatory for Replit Auth
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Sponsor operations
  getSponsors(): Promise<Sponsor[]>;
  getSponsor(id: string): Promise<Sponsor | undefined>;
  createSponsor(sponsor: InsertSponsor): Promise<Sponsor>;
  updateSponsor(id: string, sponsor: Partial<InsertSponsor>): Promise<Sponsor>;
  getActiveSponsor(): Promise<Sponsor | undefined>;
  deactivateAllSponsors(): Promise<void>;
  deleteSponsor(id: string): Promise<void>;
  
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
    console.log('[STORAGE DEBUG] Creating password reset token:', { token, email, traineeId, expiry });
    const tokenData = {
      email,
      traineeId,
      expiry: Timestamp.fromDate(expiry),
      createdAt: Timestamp.fromDate(new Date()),
    };
    
    await db.collection('passwordResetTokens').doc(token).set(tokenData);
    console.log('[STORAGE DEBUG] Password reset token created successfully');
  }

  async getPasswordResetToken(token: string): Promise<{ email: string; traineeId: string; expiry: Date } | undefined> {
    console.log('[STORAGE DEBUG] Getting password reset token:', token);
    const tokenDoc = await db.collection('passwordResetTokens').doc(token).get();
    console.log('[STORAGE DEBUG] Token document exists:', tokenDoc.exists);
    if (tokenDoc.exists) {
      const data = tokenDoc.data();
      console.log('[STORAGE DEBUG] Token data:', data);
      return {
        email: data!.email,
        traineeId: data!.traineeId,
        expiry: data!.expiry.toDate(),
      };
    }
    console.log('[STORAGE DEBUG] Token not found');
    return undefined;
  }

  async deletePasswordResetToken(token: string): Promise<void> {
    await db.collection('passwordResetTokens').doc(token).delete();
  }

  async cleanupExpiredPasswordResetTokens(): Promise<void> {
    const now = Timestamp.fromDate(new Date());
    const snapshot = await db.collection('passwordResetTokens')
      .where('expiry', '<', now)
      .get();
    
    const batch = db.batch();
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    if (snapshot.docs.length > 0) {
      await batch.commit();
      console.log(`[PASSWORD RESET] Cleaned up ${snapshot.docs.length} expired tokens`);
    }
  }
}

export const storage = new FirebaseStorage();
