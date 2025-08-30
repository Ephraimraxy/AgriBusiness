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
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  update, 
  set,
  query, 
  where, 
  orderBy, 
  limit,
  deleteDoc,
  Timestamp,
  writeBatch
} from "firebase-admin/firestore";

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
    activeExams: number;
  }>;

  // Exam operations
  getExams(sponsorId?: string): Promise<Exam[]>;
  getExam(id: string): Promise<Exam | undefined>;
  createExam(exam: InsertExam): Promise<Exam>;
  updateExam(id: string, exam: Partial<InsertExam>): Promise<Exam>;
  deleteExam(id: string): Promise<void>;
  
  // Exam question operations
  getExamQuestions(examId: string): Promise<ExamQuestion[]>;
  createExamQuestion(question: InsertExamQuestion): Promise<ExamQuestion>;
  updateExamQuestion(id: string, question: Partial<InsertExamQuestion>): Promise<ExamQuestion>;
  deleteExamQuestion(id: string): Promise<void>;
  deleteExamQuestions(examId: string): Promise<void>;
  
  // Exam attempt operations
  getExamAttempts(examId?: string, traineeId?: string): Promise<ExamAttempt[]>;
  getExamAttempt(id: string): Promise<ExamAttempt | undefined>;
  startExamAttempt(examId: string, traineeId: string): Promise<ExamAttempt>;
  submitExamAttempt(attemptId: string, answers: { questionId: string; answer: string }[]): Promise<ExamAttempt>;
  gradeExamAttempt(attemptId: string): Promise<ExamAttempt>;
}

export class DatabaseStorage implements IStorage {
  // Helper function to convert Firestore timestamps to Date objects
  private convertTimestamps(data: any): any {
    if (!data) return data;
    
    // Handle arrays
    if (Array.isArray(data)) {
      return data.map(item => this.convertTimestamps(item));
    }
    
    // Handle objects
    if (typeof data === 'object' && data !== null) {
      const converted = { ...data };
      for (const key in converted) {
        if (converted[key] instanceof Timestamp) {
          converted[key] = converted[key].toDate();
        } else if (typeof converted[key] === 'object' && converted[key] !== null) {
          converted[key] = this.convertTimestamps(converted[key]);
        }
      }
      return converted;
    }
    
    return data;
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const userDoc = await getDoc(doc(db, 'users', id));
    if (userDoc.exists()) {
      return this.convertTimestamps({ id: userDoc.id, ...userDoc.data() }) as User;
    }
    return undefined;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const userRef = doc(db, 'users', userData.id);
    const userDoc = await getDoc(userRef);
    
    const now = new Date();
    const userToSave = {
      ...userData,
      updatedAt: now,
      createdAt: userDoc.exists() ? userDoc.data()?.createdAt : now,
    };

    if (userDoc.exists()) {
      await updateDoc(userRef, userToSave);
    } else {
      await setDoc(userRef, userToSave);
    }
    return userToSave as User;
  }

  // Sponsor operations
  async getSponsors(): Promise<Sponsor[]> {
    const sponsorsQuery = query(
      collection(db, 'sponsors'),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(sponsorsQuery);
    return snapshot.docs.map(doc => 
      this.convertTimestamps({ id: doc.id, ...doc.data() }) as Sponsor
    );
  }

  async getSponsor(id: string): Promise<Sponsor | undefined> {
    const sponsorDoc = await getDoc(doc(db, 'sponsors', id));
    if (sponsorDoc.exists()) {
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
    
            const docRef = await collection(db, 'sponsors').add(sponsorData);
    return { id: docRef.id, ...sponsorData } as Sponsor;
  }

  async updateSponsor(id: string, sponsor: Partial<InsertSponsor>): Promise<Sponsor> {
    const sponsorRef = doc(db, 'sponsors', id);
    const updateData = {
      ...sponsor,
      updatedAt: new Date(),
    };
    
    await updateDoc(sponsorRef, updateData);
    const updatedDoc = await getDoc(sponsorRef);
    return this.convertTimestamps({ id: updatedDoc.id, ...updatedDoc.data() }) as Sponsor;
  }

  async getActiveSponsor(): Promise<Sponsor | undefined> {
    const sponsorsQuery = query(
      collection(db, 'sponsors'),
      where('isActive', '==', true),
      limit(1)
    );
    const snapshot = await getDocs(sponsorsQuery);
    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      return this.convertTimestamps({ id: doc.id, ...doc.data() }) as Sponsor;
    }
    return undefined;
  }

  // Deactivate all sponsors (sets isActive=false on all documents)
  async deactivateAllSponsors(): Promise<void> {
    const snapshot = await getDocs(collection(db, 'sponsors'));
    const now = new Date();
    const updates = snapshot.docs.map((docSnap) =>
      updateDoc(doc(db, 'sponsors', docSnap.id), {
        isActive: false,
        updatedAt: now,
      })
    );
    await Promise.all(updates);
  }

  // Delete sponsor by id
  async deleteSponsor(id: string): Promise<void> {
    await deleteDoc(doc(db, 'sponsors', id));
  }

  // Trainee operations
  async getTrainees(): Promise<Trainee[]> {
    const traineesQuery = query(
      collection(db, 'trainees'),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(traineesQuery);
    return snapshot.docs.map(doc => 
      this.convertTimestamps({ id: doc.id, ...doc.data() }) as Trainee
    );
  }

  async getTraineesBySponsor(sponsorId: string): Promise<Trainee[]> {
    const traineesQuery = query(
      collection(db, 'trainees'),
      where('sponsorId', '==', sponsorId)
    );
    const snapshot = await getDocs(traineesQuery);
    return snapshot.docs.map(doc => 
      this.convertTimestamps({ id: doc.id, ...doc.data() }) as Trainee
    );
  }

  async getTrainee(id: string): Promise<Trainee | undefined> {
    const traineeDoc = await getDoc(doc(db, 'trainees', id));
    if (traineeDoc.exists()) {
      return this.convertTimestamps({ id: traineeDoc.id, ...traineeDoc.data() }) as Trainee;
    }
    return undefined;
  }

  async getTraineeByEmail(email: string): Promise<Trainee | undefined> {
    const traineesQuery = query(
      collection(db, 'trainees'),
      where('email', '==', email),
      limit(1)
    );
    const snapshot = await getDocs(traineesQuery);
    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      return this.convertTimestamps({ id: doc.id, ...doc.data() }) as Trainee;
    }
    return undefined;
  }

  async getTraineeByUserId(userId: string): Promise<Trainee | undefined> {
    const traineesQuery = query(
      collection(db, 'trainees'),
      where('userId', '==', userId),
      limit(1)
    );
    const snapshot = await getDocs(traineesQuery);
    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      return this.convertTimestamps({ id: doc.id, ...doc.data() }) as Trainee;
    }
    return undefined;
  }

  async createTrainee(trainee: InsertTrainee): Promise<Trainee> {
    // Generate unique trainee ID and tag number
    const traineesSnapshot = await getDocs(collection(db, 'trainees'));
    const nextNumber = traineesSnapshot.size + 1;
    const paddedNumber = nextNumber.toString().padStart(4, '0');
    
    // Auto-assign venues and room
    const venues = {
      lecture: ['Gold Hall', 'Silver Hall', 'White Hall'],
      meal: ['Restaurant 1', 'Restaurant 2', 'Restaurant 3'],
    };
    
    const lectureVenue = venues.lecture[Math.floor(Math.random() * venues.lecture.length)];
    const mealVenue = venues.meal[Math.floor(Math.random() * venues.meal.length)];
    const roomNumber = (100 + Math.floor(Math.random() * 300)).toString();
    
    const now = new Date();
    const traineeData = {
      ...trainee,
      traineeId: `TRAINEE-${paddedNumber}`,
      tagNumber: `FAMS-${paddedNumber}`,
      roomNumber,
      lectureVenue,
      mealVenue,
      createdAt: now,
      updatedAt: now,
    };

          const docRef = await collection(db, 'trainees').add(traineeData);
    return { id: docRef.id, ...traineeData } as Trainee;
  }

  async updateTrainee(id: string, trainee: Partial<InsertTrainee>): Promise<Trainee> {
    const traineeRef = doc(db, 'trainees', id);
    const updateData = {
      ...trainee,
      updatedAt: new Date(),
    };
    
    await updateDoc(traineeRef, updateData);
    const updatedDoc = await getDoc(traineeRef);
    return this.convertTimestamps({ id: updatedDoc.id, ...updatedDoc.data() }) as Trainee;
  }

  async verifyTraineeEmail(email: string, code: string): Promise<boolean> {
    const traineesQuery = query(
      collection(db, 'trainees'),
      where('email', '==', email),
      where('verificationCode', '==', code),
      limit(1)
    );
    const snapshot = await getDocs(traineesQuery);
    
    if (!snapshot.empty) {
      const traineeDoc = snapshot.docs[0];
      const traineeData = traineeDoc.data();
      
      if (traineeData.verificationCodeExpiry && traineeData.verificationCodeExpiry.toDate() > new Date()) {
        await updateDoc(traineeDoc.ref, {
          emailVerified: true,
          verificationCode: null,
          verificationCodeExpiry: null,
          updatedAt: new Date(),
        });
        return true;
      }
    }
    return false;
  }

  // Content operations
  async getContent(): Promise<Content[]> {
    const contentQuery = query(
      collection(db, 'content'),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(contentQuery);
    return snapshot.docs.map(doc => 
      this.convertTimestamps({ id: doc.id, ...doc.data() }) as Content
    );
  }

  async getContentBySponsor(sponsorId: string): Promise<Content[]> {
    const contentQuery = query(
      collection(db, 'content'),
      where('sponsorId', '==', sponsorId)
    );
    const snapshot = await getDocs(contentQuery);
    return snapshot.docs.map(doc => 
      this.convertTimestamps({ id: doc.id, ...doc.data() }) as Content
    );
  }

  async createContent(contentData: InsertContent): Promise<Content> {
    const now = new Date();
    const content = {
      ...contentData,
      createdAt: now,
      updatedAt: now,
    };
    
    const docRef = await addDoc(collection(db, 'content'), content);
    return { id: docRef.id, ...content } as Content;
  }

  async updateContent(id: string, contentData: Partial<InsertContent>): Promise<Content> {
    const contentRef = doc(db, 'content', id);
    const updateData = {
      ...contentData,
      updatedAt: new Date(),
    };
    
    await updateDoc(contentRef, updateData);
    const updatedDoc = await getDoc(contentRef);
    return this.convertTimestamps({ id: updatedDoc.id, ...updatedDoc.data() }) as Content;
  }

  // Progress operations
  async getTraineeProgress(traineeId: string): Promise<TraineeProgress[]> {
    const progressQuery = query(
      collection(db, 'traineeProgress'),
      where('traineeId', '==', traineeId)
    );
    const snapshot = await getDocs(progressQuery);
    return snapshot.docs.map(doc => 
      this.convertTimestamps({ id: doc.id, ...doc.data() }) as TraineeProgress
    );
  }

  async updateProgress(
    traineeId: string,
    contentId: string,
    progress: Partial<TraineeProgress>
  ): Promise<TraineeProgress> {
    const progressQuery = query(
      collection(db, 'traineeProgress'),
      where('traineeId', '==', traineeId),
      where('contentId', '==', contentId),
      limit(1)
    );
    const snapshot = await getDocs(progressQuery);
    
    if (!snapshot.empty) {
      const existingDoc = snapshot.docs[0];
      const updateData = {
        ...progress,
        updatedAt: new Date(),
      };
      
      await updateDoc(existingDoc.ref, updateData);
      const updatedDoc = await getDoc(existingDoc.ref);
      return this.convertTimestamps({ id: updatedDoc.id, ...updatedDoc.data() }) as TraineeProgress;
    } else {
      const now = new Date();
      const progressData = {
        traineeId,
        contentId,
        ...progress,
        createdAt: now,
        updatedAt: now,
      };
      
      const docRef = await addDoc(collection(db, 'traineeProgress'), progressData);
      return { id: docRef.id, ...progressData } as TraineeProgress;
    }
  }

  // Announcement operations
  async getAnnouncements(): Promise<Announcement[]> {
    const announcementsQuery = query(
      collection(db, 'announcements'),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(announcementsQuery);
    return snapshot.docs.map(doc => 
      this.convertTimestamps({ id: doc.id, ...doc.data() }) as Announcement
    );
  }

  async getAnnouncementsBySponsor(sponsorId: string): Promise<Announcement[]> {
    const announcementsQuery = query(
      collection(db, 'announcements'),
      where('sponsorId', '==', sponsorId)
    );
    const snapshot = await getDocs(announcementsQuery);
    return snapshot.docs.map(doc => 
      this.convertTimestamps({ id: doc.id, ...doc.data() }) as Announcement
    );
  }

  async createAnnouncement(announcement: InsertAnnouncement, adminUser?: any): Promise<Announcement> {
    const now = new Date();
    const senderName = adminUser?.firstName ? 
      `${adminUser.firstName} ${adminUser.lastName || ''}`.trim() : 'Admin';
    
    const announcementData = {
      ...announcement,
      from: senderName,
      createdAt: now,
      updatedAt: now,
    };
    
    const docRef = await addDoc(collection(db, 'announcements'), announcementData);
    return { id: docRef.id, ...announcementData } as Announcement;
  }

  async updateAnnouncement(id: string, announcement: Partial<InsertAnnouncement>): Promise<Announcement> {
    const now = new Date();
    const updateData = {
      ...announcement,
      updatedAt: now,
    };
    
    const docRef = doc(db, 'announcements', id);
    await updateDoc(docRef, updateData);
    
    const updatedDoc = await getDoc(docRef);
    if (!updatedDoc.exists()) {
      throw new Error('Announcement not found');
    }
    
    return this.convertTimestamps({ id: updatedDoc.id, ...updatedDoc.data() }) as Announcement;
  }

  async deleteAnnouncement(id: string): Promise<void> {
    // Delete all replies first
    const repliesQuery = query(
      collection(db, 'announcementReplies'),
      where('announcementId', '==', id)
    );
    const repliesSnapshot = await getDocs(repliesQuery);
    
    // Delete all replies in a batch
    const batch = writeBatch(db);
    repliesSnapshot.docs.forEach((replyDoc) => {
      batch.delete(replyDoc.ref);
    });
    
    // Delete the announcement
    const announcementRef = doc(db, 'announcements', id);
    batch.delete(announcementRef);
    
    // Commit the batch
    await batch.commit();
  }

  // Announcement Reply operations
  async getAnnouncementReplies(announcementId: string): Promise<AnnouncementReply[]> {
    try {
      console.log("Storage: Getting replies for announcement:", announcementId);
      
      const repliesQuery = query(
        collection(db, 'announcementReplies'),
        where('announcementId', '==', announcementId),
        orderBy('createdAt', 'asc')
      );
      
      console.log("Storage: Query created, executing...");
      const snapshot = await getDocs(repliesQuery);
      console.log("Storage: Query executed, docs count:", snapshot.docs.length);
      
      const replies = snapshot.docs.map(doc => 
        this.convertTimestamps({ id: doc.id, ...doc.data() }) as AnnouncementReply
      );
      
      console.log("Storage: Replies processed:", replies.length);
      return replies;
    } catch (error: any) {
      console.error("Storage: Error getting replies:", error);
      
      // Handle Firebase index error gracefully - fetch all replies and filter in memory
      if (error.code === 'failed-precondition') {
        console.log("Storage: Firebase index not ready, fetching all replies and filtering in memory");
        try {
          const allRepliesSnapshot = await getDocs(collection(db, 'announcementReplies'));
          const allReplies = allRepliesSnapshot.docs.map(doc => 
            this.convertTimestamps({ id: doc.id, ...doc.data() }) as AnnouncementReply
          );
          
          // Filter replies for this specific announcement
          const filteredReplies = allReplies.filter(reply => reply.announcementId === announcementId);
          
          // Sort by createdAt
          filteredReplies.sort((a, b) => {
            const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
            const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
            return dateA.getTime() - dateB.getTime();
          });
          
          console.log("Storage: Filtered replies count:", filteredReplies.length);
          return filteredReplies;
        } catch (fallbackError) {
          console.error("Storage: Fallback query also failed:", fallbackError);
          return [];
        }
      }
      
      throw error;
    }
  }

  async createAnnouncementReply(reply: InsertAnnouncementReply, user: any): Promise<AnnouncementReply> {
    const now = new Date();
    const senderName = user?.firstName ? 
      `${user.firstName} ${user.lastName || ''}`.trim() : 
      (user?.role === 'admin' ? 'Admin' : 'Trainee');
    
    // Filter out undefined fields to avoid Firestore issues
    const cleanReply = Object.fromEntries(
      Object.entries(reply).filter(([_, value]) => value !== undefined)
    );
    
    const replyData = {
      ...cleanReply,
      from: senderName,
      fromId: user.id,
      fromRole: user.role,
      createdAt: now,
    };
    
    console.log('Creating announcement reply with data:', replyData);
    
    const docRef = await addDoc(collection(db, 'announcementReplies'), replyData);
    return { id: docRef.id, ...replyData } as AnnouncementReply;
  }

  // Notification operations
  async createNotification(notification: InsertNotification): Promise<Notification> {
    const now = new Date();
    const notificationData = {
      ...notification,
      createdAt: now,
    };
    
    const docRef = await addDoc(collection(db, 'notifications'), notificationData);
    return { id: docRef.id, ...notificationData } as Notification;
  }

  async getNotifications(userId: string): Promise<Notification[]> {
    try {
      const notificationsQuery = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(notificationsQuery);
      return snapshot.docs.map(doc => this.convertTimestamps({ id: doc.id, ...doc.data() } as Notification));
    } catch (error) {
      console.error('Error fetching notifications:', error);
      
      // If there's a Firebase index error, try fetching all notifications and filtering
      if (error instanceof Error && error.message.includes('failed-precondition')) {
        console.log('Firebase index not ready, fetching all notifications and filtering in memory');
        try {
          const allNotificationsQuery = query(
            collection(db, 'notifications'),
            orderBy('createdAt', 'desc')
          );
          
          const allSnapshot = await getDocs(allNotificationsQuery);
          const allNotifications = allSnapshot.docs.map(doc => 
            this.convertTimestamps({ id: doc.id, ...doc.data() } as Notification)
          );
          
          // Filter by userId in memory
          const filteredNotifications = allNotifications.filter(n => n.userId === userId);
          console.log(`Filtered notifications count: ${filteredNotifications.length}`);
          return filteredNotifications;
        } catch (fallbackError) {
          console.error('Fallback notification fetch also failed:', fallbackError);
          // Return empty array if both attempts fail
          return [];
        }
      }
      
      // For any other error, return empty array
      console.log('Returning empty notifications array due to error');
      return [];
    }
  }

  async markNotificationAsRead(notificationId: string): Promise<void> {
    await updateDoc(doc(db, 'notifications', notificationId), {
      isRead: true,
    });
  }

  // System settings
  async getSystemSetting(key: string): Promise<SystemSetting | undefined> {
    const settingDoc = await getDoc(doc(db, 'systemSettings', key));
    if (settingDoc.exists()) {
      return this.convertTimestamps({ id: settingDoc.id, ...settingDoc.data() }) as SystemSetting;
    }
    return undefined;
  }

  async updateSystemSetting(key: string, value: string): Promise<SystemSetting> {
    const settingRef = doc(db, 'systemSettings', key);
    const settingData = {
      key,
      value,
      updatedAt: new Date(),
    };
    
    await setDoc(settingRef, settingData);
    return { id: key, ...settingData } as SystemSetting;
  }

  // Statistics - Single implementation that includes exam data
  async getStatistics(): Promise<{
    totalTrainees: number;
    activeSponsors: number;
    completedCourses: number;
    activeContent: number;
    totalExams: number;
    activeExams: number;
  }> {
    const [trainees, sponsors, content, exams] = await Promise.all([
      this.getTrainees(),
      this.getSponsors(),
      this.getContent(),
      this.getExams(),
    ]);

    const completedCourses = 0; // This would need to be calculated based on your business logic
    
    return {
      totalTrainees: trainees.length,
      activeSponsors: sponsors.filter(s => s.isActive).length,
      completedCourses,
      activeContent: content.filter(c => c.isActive).length,
      totalExams: exams.length,
      activeExams: exams.filter(e => e.isActive).length,
    };
  }

  // Exam operations implementation
  async getExams(sponsorId?: string): Promise<Exam[]> {
    let q;
    if (sponsorId) {
      q = query(collection(db, 'exams'), where('sponsorId', '==', sponsorId));
    } else {
      q = collection(db, 'exams');
    }
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => this.convertTimestamps({ id: doc.id, ...doc.data() } as Exam));
  }

  async getExam(id: string): Promise<Exam | undefined> {
    const docSnap = await getDoc(doc(db, 'exams', id));
    if (!docSnap.exists()) return undefined;
    return this.convertTimestamps({ id: docSnap.id, ...docSnap.data() } as Exam);
  }

  async createExam(exam: InsertExam): Promise<Exam> {
    const now = new Date();
    const examData = {
      ...exam,
      createdAt: now,
      updatedAt: now,
    };
    const docRef = await addDoc(collection(db, 'exams'), examData);
    return { id: docRef.id, ...examData };
  }

  async updateExam(id: string, exam: Partial<InsertExam>): Promise<Exam> {
    const now = new Date();
    const examData = {
      ...exam,
      updatedAt: now,
    };
    await updateDoc(doc(db, 'exams', id), examData);
    const updated = await this.getExam(id);
    if (!updated) throw new Error('Exam not found after update');
    return updated;
  }

  async deleteExam(id: string): Promise<void> {
    // First delete all questions for this exam
    await this.deleteExamQuestions(id);
    // Then delete the exam itself
    await deleteDoc(doc(db, 'exams', id));
  }

  // Exam question operations
  async getExamQuestions(examId: string): Promise<ExamQuestion[]> {
    const q = query(
      collection(db, 'examQuestions'),
      where('examId', '==', examId),
      orderBy('orderIndex')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => this.convertTimestamps({ id: doc.id, ...doc.data() } as ExamQuestion));
  }

  async createExamQuestion(question: InsertExamQuestion): Promise<ExamQuestion> {
    const now = new Date();
    const questionData = {
      ...question,
      createdAt: now,
      updatedAt: now,
    };
    const docRef = await addDoc(collection(db, 'examQuestions'), questionData);
    return { id: docRef.id, ...questionData };
  }

  async updateExamQuestion(id: string, question: Partial<InsertExamQuestion>): Promise<ExamQuestion> {
    const now = new Date();
    const questionData = {
      ...question,
      updatedAt: now,
    };
    await updateDoc(doc(db, 'examQuestions', id), questionData);
    const updated = await this.getExamQuestion(id);
    if (!updated) throw new Error('Question not found after update');
    return updated;
  }

  async getExamQuestion(id: string): Promise<ExamQuestion | undefined> {
    const docSnap = await getDoc(doc(db, 'examQuestions', id));
    if (!docSnap.exists()) return undefined;
    return this.convertTimestamps({ id: docSnap.id, ...docSnap.data() } as ExamQuestion);
  }

  async deleteExamQuestion(id: string): Promise<void> {
    await deleteDoc(doc(db, 'examQuestions', id));
  }

  async deleteExamQuestions(examId: string): Promise<void> {
    const questions = await this.getExamQuestions(examId);
    const batch = writeBatch(db);
    questions.forEach(question => {
      batch.delete(doc(db, 'examQuestions', question.id));
    });
    await batch.commit();
  }

  // Exam attempt operations
  async getExamAttempts(examId?: string, traineeId?: string): Promise<ExamAttempt[]> {
    let q;
    if (examId && traineeId) {
      q = query(
        collection(db, 'examAttempts'),
        where('examId', '==', examId),
        where('traineeId', '==', traineeId)
      );
    } else if (examId) {
      q = query(collection(db, 'examAttempts'), where('examId', '==', examId));
    } else if (traineeId) {
      q = query(collection(db, 'examAttempts'), where('traineeId', '==', traineeId));
    } else {
      q = collection(db, 'examAttempts');
    }
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => this.convertTimestamps({ id: doc.id, ...doc.data() } as ExamAttempt));
  }

  async getExamAttempt(id: string): Promise<ExamAttempt | undefined> {
    const docSnap = await getDoc(doc(db, 'examAttempts', id));
    if (!docSnap.exists()) return undefined;
    return this.convertTimestamps({ id: docSnap.id, ...docSnap.data() } as ExamAttempt);
  }

  async startExamAttempt(examId: string, traineeId: string): Promise<ExamAttempt> {
    const now = new Date();
    const exam = await this.getExam(examId);
    if (!exam) throw new Error('Exam not found');

    // Check if there's an existing in-progress attempt
    const existingAttempts = await this.getExamAttempts(examId, traineeId);
    const inProgressAttempt = existingAttempts.find(a => a.status === 'in_progress');
    
    if (inProgressAttempt) {
      // If there's an in-progress attempt, return it
      return inProgressAttempt;
    }

    // Create a new attempt
    const attemptData = {
      examId,
      traineeId,
      startTime: now,
      status: 'in_progress' as const,
      createdAt: now,
      updatedAt: now,
    };
    
    const docRef = await addDoc(collection(db, 'examAttempts'), attemptData);
    return { id: docRef.id, ...attemptData };
  }

  async submitExamAttempt(attemptId: string, answers: { questionId: string; answer: string }[]): Promise<ExamAttempt> {
    const now = new Date();
    const attempt = await this.getExamAttempt(attemptId);
    if (!attempt) throw new Error('Attempt not found');
    if (attempt.status !== 'in_progress') throw new Error('Attempt is not in progress');

    // Update the attempt status
    await updateDoc(doc(db, 'examAttempts', attemptId), {
      status: 'submitted',
      endTime: now,
      updatedAt: now,
    });

    // Save the answers
    const answerPromises = answers.map(async ({ questionId, answer }) => {
      const question = await this.getExamQuestion(questionId);
      if (!question) return;
      
      const isCorrect = question.correctAnswer === answer;
      const pointsAwarded = isCorrect ? question.points : 0;
      
      await addDoc(collection(db, 'examAnswers'), {
        attemptId,
        questionId,
        answer,
        isCorrect,
        pointsAwarded,
        createdAt: now,
        updatedAt: now,
      });
    });

    await Promise.all(answerPromises);

    // Return the updated attempt
    const updated = await this.getExamAttempt(attemptId);
    if (!updated) throw new Error('Failed to update attempt');
    return updated;
  }

  async gradeExamAttempt(attemptId: string): Promise<ExamAttempt> {
    const now = new Date();
    const attempt = await this.getExamAttempt(attemptId);
    if (!attempt) throw new Error('Attempt not found');
    if (attempt.status === 'in_progress') {
      throw new Error('Cannot grade an in-progress attempt');
    }
    if (attempt.status === 'graded') {
      return attempt; // Already graded
    }

    // Get all answers for this attempt
    const answersSnapshot = await getDocs(
      query(collection(db, 'examAnswers'), where('attemptId', '==', attemptId))
    );
    
    const answers = answersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Calculate total score
    const totalScore = answers.reduce((sum: number, answer: any) => sum + (answer.pointsAwarded || 0), 0);

    // Update the attempt with the score and status
    await updateDoc(doc(db, 'examAttempts', attemptId), {
      status: 'graded',
      score: totalScore,
      updatedAt: now,
    });

    // Return the updated attempt
    const updated = await this.getExamAttempt(attemptId);
    if (!updated) throw new Error('Failed to update attempt');
    return updated;
  }

  // This method is now implemented above with the correct return type
}

export const storage = new DatabaseStorage();
