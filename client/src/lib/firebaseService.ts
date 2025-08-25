import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  writeBatch,
  setDoc
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "./firebase";

// User types
export interface BaseUser {
  id: string;
  firstName: string;
  surname: string;
  middleName?: string;
  email: string;
  phone: string;
  role: "staff" | "resource_person" | "trainee";
  isVerified: boolean;
  createdAt: Timestamp;
}

// New ID Generation interfaces
export interface GeneratedId {
  id: string;
  type: "staff" | "resource_person";
  status: "available" | "assigned" | "activated";
  assignedTo?: string; // email of the person assigned
  createdAt: Timestamp;
  activatedAt?: Timestamp;
  assignedAt?: Timestamp;
}

export interface Trainee extends BaseUser {
  role: "trainee";
  tagNumber: string;
  dateOfBirth: string;
  gender: "male" | "female";
  state?: string;
  lga?: string;
  sponsorId?: string;
  batchId?: string;
  roomNumber?: string;
  roomBlock?: string;
  bedSpace?: string;
  allocationStatus: 'pending' | 'allocated' | 'no_rooms' | 'no_tags';
  verificationMethod: "email" | "phone";
}

export interface Staff extends BaseUser {
  role: "staff";
  department?: string;
  position?: string;
}

export interface ResourcePerson extends BaseUser {
  role: "resource_person";
  specialization?: string;
}

export interface Sponsor {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  batchId?: string;
  createdAt: Timestamp;
}

export interface Batch {
  id: string;
  name: string;
  year: number;
  isActive: boolean;
  description?: string;
  createdAt: Timestamp;
}

export interface Room {
  id?: string;
  roomNumber: string;
  bedSpace: string;
  block: string;
  status: 'available' | 'occupied' | 'maintenance' | 'partially_occupied' | 'fully_occupied';
  currentOccupancy?: number;
  createdAt?: any;
}

export interface TagNumber {
  id?: string;
  tagNo: string;
  status: 'available' | 'assigned';
  createdAt?: any;
}

export interface Facility {
  id?: string;
  name: string;
  capacity: string;
  description: string;
  status: 'available' | 'booked' | 'maintenance';
  createdAt?: any;
}

export interface HousekeepingTask {
  id?: string;
  taskName: string;
  description: string;
  scheduledTime: string;
  status: 'pending' | 'in-progress' | 'completed' | 'overdue';
  rooms?: string[];
  createdAt?: any;
}

export interface GuestService {
  id?: string;
  guestName: string;
  roomNumber: string;
  serviceType: 'check-in' | 'check-out' | 'special-request';
  status: 'pending' | 'in-progress' | 'completed';
  description: string;
  createdAt?: any;
}

// Collections
export const USERS_COLLECTION = "users";
export const TRAINEES_COLLECTION = "trainees";
export const STAFF_COLLECTION = "staff";
export const RESOURCE_PERSONS_COLLECTION = "resource_persons";
export const SPONSORS_COLLECTION = "sponsors";
export const BATCHES_COLLECTION = "batches";
export const MESSAGES_COLLECTION = "messages";
export const NOTIFICATIONS_COLLECTION = "notifications";

// Generic CRUD operations
export const createDocument = async <T>(collectionName: string, data: Omit<T, 'id' | 'createdAt'>) => {
  // Filter out undefined values
  const cleanData = Object.fromEntries(
    Object.entries(data).filter(([_, value]) => value !== undefined)
  );

  const docRef = await addDoc(collection(db, collectionName), {
    ...cleanData,
    createdAt: Timestamp.now()
  });
  return docRef.id;
};

export const createDocumentWithId = async <T>(collectionName: string, documentId: string, data: Omit<T, 'id' | 'createdAt'>) => {
  // Filter out undefined values
  const cleanData = Object.fromEntries(
    Object.entries(data).filter(([_, value]) => value !== undefined)
  );

  const docRef = doc(db, collectionName, documentId);
  await setDoc(docRef, {
    ...cleanData,
    createdAt: Timestamp.now()
  });
  return documentId;
};

export const getDocument = async <T>(collectionName: string, id: string): Promise<T | null> => {
  const docRef = doc(db, collectionName, id);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as T;
  }
  return null;
};

export const getAllDocuments = async <T>(collectionName: string): Promise<T[]> => {
  try {
    console.log('getAllDocuments called for collection:', collectionName);
    const querySnapshot = await getDocs(collection(db, collectionName));
    console.log('getAllDocuments querySnapshot:', querySnapshot);
    console.log('getAllDocuments docs count:', querySnapshot.docs.length);
    const result = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as T);
    console.log('getAllDocuments result:', result);
    return result;
  } catch (error) {
    console.error('Error in getAllDocuments for collection:', collectionName, error);
    throw error;
  }
};

export const updateDocument = async <T>(collectionName: string, id: string, data: Partial<T>) => {
  const docRef = doc(db, collectionName, id);
  await updateDoc(docRef, data);
};

export const deleteDocument = async (collectionName: string, id: string) => {
  await deleteDoc(doc(db, collectionName, id));
};

// Enhanced delete functions that handle ID management
export const deleteStaffAndFreeId = async (staffId: string) => {
  try {
    // 1. Delete from main staff collection
    await deleteDocument("staff", staffId);
    
    // 2. Delete from staff registrations
    await deleteDocument("staff_registrations", staffId);
    
    // 3. Reset ID status to available in generatedIds
    const generatedIdsQuery = query(
      collection(db, 'generatedIds'),
      where('id', '==', staffId),
      where('type', '==', 'staff')
    );
    const querySnapshot = await getDocs(generatedIdsQuery);
    
    if (!querySnapshot.empty) {
      const docRef = doc(db, 'generatedIds', querySnapshot.docs[0].id);
      await updateDoc(docRef, {
        status: 'available',
        assignedTo: null,
        assignedAt: null
      });
      console.log(`ID ${staffId} has been freed and is now available for reuse`);
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting staff and freeing ID:', error);
    throw error;
  }
};

// Enhanced delete function that automatically frees IDs
export const deleteStaffWithAutoIdFree = async (staffId: string) => {
  try {
    // 1. Delete from main staff collection
    await deleteDocument("staff", staffId);
    
    // 2. Delete from staff registrations
    await deleteDocument("staff_registrations", staffId);
    
    // 3. Automatically free the ID for reuse
    const generatedIdsQuery = query(
      collection(db, 'generatedIds'),
      where('id', '==', staffId),
      where('type', '==', 'staff')
    );
    const querySnapshot = await getDocs(generatedIdsQuery);
    
    if (!querySnapshot.empty) {
      const docRef = doc(db, 'generatedIds', querySnapshot.docs[0].id);
      await updateDoc(docRef, {
        status: 'available',
        assignedTo: null,
        assignedAt: null,
        freedAt: Timestamp.now(),
        freedReason: 'User deleted by admin'
      });
      console.log(`ID ${staffId} has been automatically freed and is now available for reuse`);
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting staff and freeing ID:', error);
    throw error;
  }
};

export const deleteResourcePersonAndFreeId = async (rpId: string) => {
  try {
    // 1. Delete from main resourcePersons collection
    await deleteDocument("resourcePersons", rpId);
    
    // 2. Delete from resource person registrations
    await deleteDocument("resource_person_registrations", rpId);
    
    // 3. Reset ID status to available in generatedIds
    const generatedIdsQuery = query(
      collection(db, 'generatedIds'),
      where('id', '==', rpId),
      where('type', '==', 'resource_person')
    );
    const querySnapshot = await getDocs(generatedIdsQuery);
    
    if (!querySnapshot.empty) {
      const docRef = doc(db, 'generatedIds', querySnapshot.docs[0].id);
      await updateDoc(docRef, {
        status: 'available',
        assignedTo: null,
        assignedAt: null
      });
      console.log(`ID ${rpId} has been freed and is now available for reuse`);
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting resource person and freeing ID:', error);
    throw error;
  }
};

// Enhanced delete function that automatically frees IDs
export const deleteResourcePersonWithAutoIdFree = async (rpId: string) => {
  try {
    // 1. Delete from main resourcePersons collection
    await deleteDocument("resourcePersons", rpId);
    
    // 2. Delete from resource person registrations
    await deleteDocument("resource_person_registrations", rpId);
    
    // 3. Automatically free the ID for reuse
    const generatedIdsQuery = query(
      collection(db, 'generatedIds'),
      where('id', '==', rpId),
      where('type', '==', 'resource_person')
    );
    const querySnapshot = await getDocs(generatedIdsQuery);
    
    // 4. Reset ID status to available in generatedIds
    if (!querySnapshot.empty) {
      const docRef = doc(db, 'generatedIds', querySnapshot.docs[0].id);
      await updateDoc(docRef, {
        status: 'available',
        assignedTo: null,
        assignedAt: null,
        freedAt: Timestamp.now(),
        freedReason: 'User deleted by admin'
      });
      console.log(`ID ${rpId} has been automatically freed and is now available for reuse`);
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting resource person and freeing ID:', error);
    throw error;
  }
};

// Check if an ID is already in use by another person
export const isIdInUse = async (id: string, type: "staff" | "resource_person"): Promise<boolean> => {
  try {
    // Check in main collections
    const mainCollection = type === "staff" ? "staff" : "resourcePersons";
    const registrationCollection = type === "staff" ? "staff_registrations" : "resource_person_registrations";
    
    // Check if ID exists in main collection
    const mainDoc = await getDocument(mainCollection, id);
    if (mainDoc) {
      return true; // ID is already in use
    }
    
    // Check if ID exists in registrations collection
    const regDoc = await getDocument(registrationCollection, id);
    if (regDoc) {
      return true; // ID is already in use
    }
    
    return false; // ID is not in use
  } catch (error) {
    console.error('Error checking if ID is in use:', error);
    return false; // Assume not in use if error occurs
  }
};

// Enhanced ID validation that checks multiple sources
export const validateIdAvailability = async (id: string, type: "staff" | "resource_person"): Promise<{
  isAvailable: boolean;
  error?: string;
  currentUser?: string;
}> => {
  try {
    // 1. Check if ID exists in generatedIds collection
    const generatedIdsQuery = query(
      collection(db, 'generatedIds'),
      where('id', '==', id),
      where('type', '==', type)
    );
    const querySnapshot = await getDocs(generatedIdsQuery);
    
    if (querySnapshot.empty) {
      return {
        isAvailable: false,
        error: `ID ${id} does not exist in the system. Please generate a new ${type === "staff" ? "Staff" : "Resource Person"} ID first.`
      };
    }
    
    const idData = querySnapshot.docs[0].data() as GeneratedId;
    
    // 2. Check ID status
    if (idData.status === 'assigned') {
      return {
        isAvailable: false,
        error: `ID ${id} is already assigned to ${idData.assignedTo || 'another person'}.`,
        currentUser: idData.assignedTo
      };
    }
    
    if (idData.status === 'activated') {
      return {
        isAvailable: false,
        error: `ID ${id} is already activated and cannot be used for registration.`
      };
    }
    
    // 3. Double-check that no one is actually using this ID
    const isInUse = await isIdInUse(id, type);
    if (isInUse) {
      return {
        isAvailable: false,
        error: `ID ${id} is already in use by another person.`
      };
    }
    
    // 4. ID is available
    return {
      isAvailable: true
    };
    
  } catch (error) {
    console.error('Error validating ID availability:', error);
    return {
      isAvailable: false,
      error: 'Failed to validate ID. Please check your connection and try again.'
    };
  }
};

// Enhanced GeneratedId interface with additional fields
export interface EnhancedGeneratedId extends GeneratedId {
  freedAt?: Timestamp;
  freedReason?: string;
  lastAssignedTo?: string;
  lastAssignedAt?: Timestamp;
  usageCount?: number;
}

// Admin ID Management Functions
export const generateNewIds = async (type: "staff" | "resource_person", count: number = 1): Promise<string[]> => {
  try {
    const generatedIds: string[] = [];
    
    for (let i = 0; i < count; i++) {
      // Get the latest ID number for this type
      const existingIds = await getGeneratedIds(type);
      const latestId = existingIds
        .filter(id => id.id.startsWith(type === "staff" ? "ST-" : "RP-"))
        .sort((a, b) => {
          const aNum = parseInt(a.id.match(/\d+$/)?.[0] || "0");
          const bNum = parseInt(b.id.match(/\d+$/)?.[0] || "0");
          return bNum - aNum;
        })[0];
      
      let nextNumber = 1;
      if (latestId) {
        const currentNumber = parseInt(latestId.id.match(/\d+$/)?.[0] || "0");
        nextNumber = currentNumber + 1;
      }
      
      const newId = type === "staff" ? `ST-0C0S0S${nextNumber}` : `RP-0C0S0S${nextNumber}`;
      
      // Create the new ID document
      const newIdData: EnhancedGeneratedId = {
        id: newId,
        type,
        status: 'available',
        createdAt: Timestamp.now(),
        usageCount: 0
      };
      
      await createDocument('generatedIds', newIdData);
      generatedIds.push(newId);
    }
    
    return generatedIds;
  } catch (error) {
    console.error('Error generating new IDs:', error);
    throw new Error('Failed to generate new IDs');
  }
};

// Get detailed ID information for admin management
export const getDetailedIdInfo = async (id: string): Promise<EnhancedGeneratedId | null> => {
  try {
    const generatedIdsQuery = query(
      collection(db, 'generatedIds'),
      where('id', '==', id)
    );
    const querySnapshot = await getDocs(generatedIdsQuery);
    
    if (querySnapshot.empty) {
      return null;
    }
    
    const idData = querySnapshot.docs[0].data() as EnhancedGeneratedId;
    return {
      ...idData,
      id: idData.id
    };
  } catch (error) {
    console.error('Error getting detailed ID info:', error);
    return null;
  }
};

// Admin function to manually free an ID
export const adminFreeId = async (id: string, reason: string = 'Manually freed by admin'): Promise<boolean> => {
  try {
    const generatedIdsQuery = query(
      collection(db, 'generatedIds'),
      where('id', '==', id)
    );
    const querySnapshot = await getDocs(generatedIdsQuery);
    
    if (querySnapshot.empty) {
      throw new Error(`ID ${id} not found in generated IDs`);
    }
    
    const docRef = doc(db, 'generatedIds', querySnapshot.docs[0].id);
    const currentData = querySnapshot.docs[0].data() as EnhancedGeneratedId;
    
    // Update the ID status
    await updateDoc(docRef, {
      status: 'available',
      assignedTo: null,
      assignedAt: null,
      freedAt: Timestamp.now(),
      freedReason: reason,
      lastAssignedTo: currentData.assignedTo || null,
      lastAssignedAt: currentData.assignedAt || null,
      usageCount: (currentData.usageCount || 0) + 1
    });
    
    console.log(`ID ${id} has been manually freed by admin`);
    return true;
  } catch (error) {
    console.error('Error freeing ID:', error);
    throw error;
  }
};

// Admin function to deactivate an ID (prevent future use)
export const adminDeactivateId = async (id: string, reason: string = 'Deactivated by admin'): Promise<boolean> => {
  try {
    const generatedIdsQuery = query(
      collection(db, 'generatedIds'),
      where('id', '==', id)
    );
    const querySnapshot = await getDocs(generatedIdsQuery);
    
    if (querySnapshot.empty) {
      throw new Error(`ID ${id} not found in generated IDs`);
    }
    
    const docRef = doc(db, 'generatedIds', querySnapshot.docs[0].id);
    
    await updateDoc(docRef, {
      status: 'deactivated',
      deactivatedAt: Timestamp.now(),
      deactivationReason: reason
    });
    
    console.log(`ID ${id} has been deactivated by admin`);
    return true;
  } catch (error) {
    console.error('Error deactivating ID:', error);
    throw error;
  }
};

// Get ID statistics for admin dashboard
export const getIdStatistics = async (): Promise<{
  total: number;
  available: number;
  assigned: number;
  activated: number;
  deactivated: number;
  freed: number;
  byType: {
    staff: { total: number; available: number; assigned: number; activated: number; deactivated: number; freed: number; };
    resource_person: { total: number; available: number; assigned: number; activated: number; deactivated: number; freed: number; };
  };
}> => {
  try {
    const allIds = await getGeneratedIds();
    
    const stats = {
      total: allIds.length,
      available: allIds.filter(id => id.status === 'available').length,
      assigned: allIds.filter(id => id.status === 'assigned').length,
      activated: allIds.filter(id => id.status === 'activated').length,
      deactivated: allIds.filter(id => id.status === 'deactivated').length,
      freed: allIds.filter(id => id.freedAt).length,
      byType: {
        staff: {
          total: allIds.filter(id => id.type === 'staff').length,
          available: allIds.filter(id => id.type === 'staff' && id.status === 'available').length,
          assigned: allIds.filter(id => id.type === 'staff' && id.status === 'assigned').length,
          activated: allIds.filter(id => id.type === 'staff' && id.status === 'activated').length,
          deactivated: allIds.filter(id => id.type === 'staff' && id.status === 'deactivated').length,
          freed: allIds.filter(id => id.type === 'staff' && id.freedAt).length,
        },
        resource_person: {
          total: allIds.filter(id => id.type === 'resource_person').length,
          available: allIds.filter(id => id.type === 'resource_person' && id.status === 'available').length,
          assigned: allIds.filter(id => id.type === 'resource_person' && id.status === 'assigned').length,
          activated: allIds.filter(id => id.type === 'resource_person' && id.status === 'activated').length,
          deactivated: allIds.filter(id => id.type === 'resource_person' && id.status === 'deactivated').length,
          freed: allIds.filter(id => id.type === 'resource_person' && id.freedAt).length,
        }
      }
    };
    
    return stats;
  } catch (error) {
    console.error('Error getting ID statistics:', error);
    throw error;
  }
};

export const queryDocuments = async <T>(
  collectionName: string,
  field: string,
  operator: any,
  value: any
): Promise<T[]> => {
  const q = query(collection(db, collectionName), where(field, operator, value));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as T);
};

// User-specific functions
export const createUser = async (userData: Omit<BaseUser, 'id' | 'createdAt'>) => {
  return await createDocument(USERS_COLLECTION, userData);
};

export const getUsers = async (): Promise<BaseUser[]> => {
  return await getAllDocuments<BaseUser>(USERS_COLLECTION);
};

export const getUserByEmail = async (email: string): Promise<BaseUser | null> => {
  const users = await queryDocuments<BaseUser>(USERS_COLLECTION, "email", "==", email);
  return users.length > 0 ? users[0] : null;
};

// Trainee-specific functions
export const createTrainee = async (traineeData: Omit<Trainee, 'id' | 'createdAt'>) => {
  return await createDocument(TRAINEES_COLLECTION, traineeData);
};

export const getTrainees = async (): Promise<Trainee[]> => {
  try {
    console.log('getTrainees called - fetching from collection:', TRAINEES_COLLECTION);
    const trainees = await getAllDocuments<Trainee>(TRAINEES_COLLECTION);
    console.log('getTrainees result:', trainees);
    return trainees;
  } catch (error) {
    console.error('Error in getTrainees:', error);
    throw error;
  }
};

export const getTraineesByBatch = async (batchId: string): Promise<Trainee[]> => {
  return await queryDocuments<Trainee>(TRAINEES_COLLECTION, "batchId", "==", batchId);
};

// Sponsor functions
export const createSponsor = async (sponsorData: Omit<Sponsor, 'id' | 'createdAt'>) => {
  return await createDocument(SPONSORS_COLLECTION, sponsorData);
};

export const getSponsors = async (): Promise<Sponsor[]> => {
  return await getAllDocuments<Sponsor>(SPONSORS_COLLECTION);
};

export const getActiveSponsors = async (): Promise<Sponsor[]> => {
  return await queryDocuments<Sponsor>(SPONSORS_COLLECTION, "isActive", "==", true);
};

// Batch functions
export const createBatch = async (batchData: Omit<Batch, 'id' | 'createdAt'>) => {
  return await createDocument(BATCHES_COLLECTION, batchData);
};

export const getBatches = async (): Promise<Batch[]> => {
  return await getAllDocuments<Batch>(BATCHES_COLLECTION);
};

export const getActiveBatches = async (): Promise<Batch[]> => {
  return await queryDocuments<Batch>(BATCHES_COLLECTION, "isActive", "==", true);
};

// Staff functions
export const createStaff = async (staffData: Omit<Staff, 'id' | 'createdAt'>) => {
  return await createDocument(STAFF_COLLECTION, staffData);
};

export const getStaff = async (): Promise<Staff[]> => {
  return await getAllDocuments<Staff>(STAFF_COLLECTION);
};

// Resource Person functions
export const createResourcePerson = async (rpData: Omit<ResourcePerson, 'id' | 'createdAt'>) => {
  return await createDocument(RESOURCE_PERSONS_COLLECTION, rpData);
};

export const getResourcePersons = async (): Promise<ResourcePerson[]> => {
  return await getAllDocuments<ResourcePerson>(RESOURCE_PERSONS_COLLECTION);
};

// Message functions
export const createMessage = async (messageData: {
  fromId: string;
  fromName: string;
  fromEmail: string;
  fromTagNumber: string;
  fromRoom?: string;
  toId: string;
  toName: string;
  toEmail: string;
  subject: string;
  message: string;
  isRead: boolean;
  traineeSponsorId?: string;
  messageType: 'trainee_to_rp' | 'rp_to_trainee' | 'admin_broadcast';
  priority: 'low' | 'normal' | 'high' | 'urgent';
}): Promise<string> => {
  try {
    // Create the message
    const messageId = await createDocument(MESSAGES_COLLECTION, messageData);
    
    // Create enhanced notification for the recipient
    const notificationData = {
      userId: messageData.toId,
      type: 'message' as const,
      title: `New message from ${messageData.fromName} (${messageData.fromTagNumber})`,
      message: `${messageData.subject} - From: ${messageData.fromEmail}`,
      messageId: messageId,
      fromId: messageData.fromId,
      fromName: messageData.fromName,
      fromEmail: messageData.fromEmail,
      fromTagNumber: messageData.fromTagNumber,
      isRead: false,
    };
    
    await createDocument(NOTIFICATIONS_COLLECTION, notificationData);
    
    console.log('Message created successfully:', messageId);
    console.log('Notification created for recipient:', messageData.toId);
    console.log('Notification data created:', notificationData);
    console.log('Notification collection used:', NOTIFICATIONS_COLLECTION);
    
    return messageId;
  } catch (error) {
    console.error('Error creating message:', error);
    throw error;
  }
};

export const getMessages = async (userId: string): Promise<any[]> => {
  try {
    const messagesQuery = query(
      collection(db, MESSAGES_COLLECTION),
      where('toId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(messagesQuery);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error fetching messages:', error);
    throw error;
  }
};

export const markMessageAsRead = async (messageId: string): Promise<void> => {
  try {
    const docRef = doc(db, MESSAGES_COLLECTION, messageId);
    await updateDoc(docRef, { isRead: true });
  } catch (error) {
    console.error('Error marking message as read:', error);
    throw error;
  }
};

// Notification functions
export const getNotifications = async (userId: string): Promise<any[]> => {
  try {
    const notificationsQuery = query(
      collection(db, NOTIFICATIONS_COLLECTION),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(notificationsQuery);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error fetching notifications:', error);
    throw error;
  }
};

export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
  try {
    const docRef = doc(db, NOTIFICATIONS_COLLECTION, notificationId);
    await updateDoc(docRef, { isRead: true });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
};

export const getUnreadNotificationCount = async (userId: string): Promise<number> => {
  try {
    const notificationsQuery = query(
      collection(db, NOTIFICATIONS_COLLECTION),
      where('userId', '==', userId),
      where('isRead', '==', false)
    );
    
    const querySnapshot = await getDocs(notificationsQuery);
    return querySnapshot.size;
  } catch (error) {
    console.error('Error fetching unread notification count:', error);
    return 0;
  }
};

// File upload function
export const uploadFile = async (file: File, path: string): Promise<string> => {
  const storageRef = ref(storage, path);
  const snapshot = await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(snapshot.ref);
  return downloadURL;
};

// Generate unique tag number
export const generateTagNumber = async (): Promise<string> => {
  const trainees = await getTrainees();
  const currentYear = new Date().getFullYear();
  const existingTags = trainees.map(t => t.tagNumber);

  let tagNumber: string;
  let counter = 1;

  do {
    tagNumber = `TRN${currentYear}${counter.toString().padStart(4, '0')}`;
    counter++;
  } while (existingTags.includes(tagNumber));

  return tagNumber;
};

// Room allocation function
export const allocateRoom = async (gender: "male" | "female"): Promise<{ roomNumber: string; roomBlock: string } | null> => {
  const trainees = await getTrainees();
  const occupiedRooms = trainees
    .filter(t => t.roomNumber && t.roomBlock)
    .map(t => `${t.roomBlock}-${t.roomNumber}`);

  // Simple room allocation logic
  const blocks = gender === "male" ? ["A", "B"] : ["C", "D"];
  const roomsPerBlock = 50;

  for (const block of blocks) {
    for (let room = 1; room <= roomsPerBlock; room++) {
      const roomKey = `${block}-${room.toString().padStart(3, '0')}`;
      if (!occupiedRooms.includes(roomKey)) {
        return {
          roomBlock: block,
          roomNumber: room.toString().padStart(3, '0')
        };
      }
    }
  }

  return null; // No available rooms
};

// Enhanced allocation functions
export const allocateTagNumber = async (): Promise<string | null> => {
  const tagNumbers = await getTagNumbers();
  const availableTags = tagNumbers.filter(t => t.status === 'available');

  if (availableTags.length === 0) {
    return null;
  }

  // Get the first available tag
  const tag = availableTags[0];
  return tag.tagNo;
};

export const allocateRoomWithBedSpace = async (gender: "male" | "female"): Promise<{ roomNumber: string; roomBlock: string; bedSpace: string } | null> => {
  const trainees = await getTrainees();
  const rooms = await getRooms();

  // Find rooms with available bed space for the given gender
  const availableRooms = rooms.filter(room => {
    // Check if room is available and matches gender block
    const isMaleRoom = room.block === 'A' || room.block === 'B';
    const isFemaleRoom = room.block === 'C' || room.block === 'D';

    if ((gender === 'male' && isMaleRoom) || (gender === 'female' && isFemaleRoom)) {
      // Calculate current occupancy
      const traineesInRoom = trainees.filter(t =>
        t.roomNumber === room.roomNumber &&
        t.roomBlock === room.block
      );

      const bedSpaceNumber = parseInt(room.bedSpace) || 1;
      const availableBeds = bedSpaceNumber - traineesInRoom.length;

      return availableBeds > 0;
    }
    return false;
  });

  if (availableRooms.length === 0) {
    return null;
  }

  // Get the first available room
  const room = availableRooms[0];
  return {
    roomNumber: room.roomNumber,
    roomBlock: room.block,
    bedSpace: room.bedSpace
  };
};

export const synchronizeAllocations = async (): Promise<{
  allocated: number;
  noRooms: number;
  noTags: number;
  roomsUpdated: number;
  tagsUpdated: number;
  inconsistencies: number;
  summary: {
    totalTrainees: number;
    allocatedTrainees: number;
    pendingTrainees: number;
    noRoomsTrainees: number;
    noTagsTrainees: number;
    totalRooms: number;
    availableRooms: number;
    occupiedRooms: number;
    totalTags: number;
    availableTags: number;
    assignedTags: number;
  };
}> => {
  console.log("Starting comprehensive allocation synchronization...");

  const trainees = await getTrainees();
  const tagNumbers = await getTagNumbers();
  const rooms = await getRooms();

  let allocated = 0;
  let noRooms = 0;
  let noTags = 0;
  let roomsUpdated = 0;
  let tagsUpdated = 0;
  let inconsistencies = 0;

  // Step 1: Deep database status analysis
  console.log("Step 1: Analyzing current database status...");

  const analysis = {
    trainees: {
      total: trainees.length,
      pending: trainees.filter(t => t.allocationStatus === 'pending').length,
      allocated: trainees.filter(t => t.allocationStatus === 'allocated').length,
      noRooms: trainees.filter(t => t.allocationStatus === 'no_rooms').length,
      noTags: trainees.filter(t => t.allocationStatus === 'no_tags').length,
      withRooms: trainees.filter(t => t.roomNumber && t.roomNumber !== 'pending').length,
      withTags: trainees.filter(t => t.tagNumber && t.tagNumber !== 'pending').length,
      withoutRooms: trainees.filter(t => !t.roomNumber || t.roomNumber === 'pending').length,
      withoutTags: trainees.filter(t => !t.tagNumber || t.tagNumber === 'pending').length
    },
    rooms: {
      total: rooms.length,
      available: rooms.filter(r => r.status === 'available').length,
      occupied: rooms.filter(r => r.status === 'occupied' || r.status === 'fully_occupied').length,
      partiallyOccupied: rooms.filter(r => r.status === 'partially_occupied').length,
      maintenance: rooms.filter(r => r.status === 'maintenance').length
    },
    tags: {
      total: tagNumbers.length,
      available: tagNumbers.filter(t => t.status === 'available').length,
      assigned: tagNumbers.filter(t => t.status === 'assigned').length
    }
  };

  console.log("Database Analysis:", analysis);

  // Step 2: Fix room status inconsistencies
  console.log("Step 2: Fixing room status inconsistencies...");

  for (const room of rooms) {
    if (room.roomNumber && room.block) {
      const roomNumber = room.roomNumber as string;
      const roomBlock = room.block as string;
      const bedSpace = room.bedSpace as string;

      if (!roomNumber || !roomBlock) {
        console.error(`Invalid room data: ${JSON.stringify(room)}`);
        inconsistencies++;
        continue;
      }

      // Find all trainees in this room
      const traineesInRoom = trainees.filter(t =>
        t.roomNumber === roomNumber &&
        t.roomBlock === roomBlock
      );

      const bedSpaceType = parseInt(bedSpace) || 1;
      const actualOccupancy = traineesInRoom.length;

      // Calculate correct room status based on actual occupancy
      let correctStatus: string;
      if (bedSpaceType === 1) {
        correctStatus = actualOccupancy >= 1 ? 'occupied' : 'available';
      } else if (bedSpaceType === 2) {
        correctStatus = actualOccupancy === 0 ? 'available' :
                       actualOccupancy === 1 ? 'partially_occupied' :
                       'occupied';
      } else {
        correctStatus = actualOccupancy >= bedSpaceType ? 'occupied' :
                       actualOccupancy > 0 ? 'partially_occupied' : 'available';
      }

      // Check if room status needs updating
      if (room.status !== correctStatus || room.currentOccupancy !== actualOccupancy) {
        console.log(`Updating room ${roomNumber} (${roomBlock}): status from ${room.status} to ${correctStatus}, occupancy from ${room.currentOccupancy || 0} to ${actualOccupancy}`);

        if (room.id) {
        await updateDocument("rooms", room.id, {
            status: correctStatus,
            currentOccupancy: actualOccupancy
          });
          roomsUpdated++;
        }
      }
    }
  }

  // Step 3: Fix tag number inconsistencies
  console.log("Step 3: Fixing tag number inconsistencies...");

  // Check for trainees with assigned tags but tags are marked as available
  for (const trainee of trainees) {
    if (trainee.tagNumber && trainee.tagNumber !== 'pending') {
      const assignedTag = tagNumbers.find(t => t.tagNo === trainee.tagNumber);
      if (assignedTag && assignedTag.status === 'available') {
        console.log(`Fixing tag status for trainee ${trainee.firstName} ${trainee.surname}: tag ${trainee.tagNumber} should be assigned`);
        if (assignedTag.id) {
          await updateDocument("tagNumbers", assignedTag.id, {
            status: 'assigned'
          });
          tagsUpdated++;
        }
      }
    }
  }

  // Step 4: Comprehensive tag allocation
  console.log("Step 4: Processing tag number allocations...");

  const traineesNeedingTags = trainees.filter(t =>
    t.allocationStatus === 'pending' ||
    t.tagNumber === 'pending' ||
    !t.tagNumber
  );

  console.log(`Found ${traineesNeedingTags.length} trainees needing tag allocation`);

  // Get available tags
  let availableTags = tagNumbers.filter(t => t.status === 'available');
  console.log(`Available tags: ${availableTags.length}`);

  for (const trainee of traineesNeedingTags) {
    try {
      console.log(`Processing trainee for tag: ${trainee.firstName} ${trainee.surname}`);

      // Get next available tag
      const availableTag = availableTags.shift();

      if (availableTag?.id) {
        // Update trainee with tag number
        await updateDocument("trainees", trainee.id, {
          tagNumber: availableTag.tagNo,
          allocationStatus: 'allocated'
        });

        // Update tag status
        await updateDocument("tagNumbers", availableTag.id, {
          status: 'assigned'
        });

        allocated++;
        console.log(`✓ Allocated tag ${availableTag.tagNo} to ${trainee.firstName} ${trainee.surname}`);
      } else {
        // Update trainee status if no tags available
        await updateDocument("trainees", trainee.id, {
          allocationStatus: 'no_tags'
        });
        noTags++;
        console.log(`✗ No tags available for ${trainee.firstName} ${trainee.surname}`);
      }
    } catch (error) {
      console.error(`Error processing trainee ${trainee.id}:`, error);
      inconsistencies++;
    }
  }

  // Step 5: Comprehensive room allocation
  console.log("Step 5: Processing room allocations...");

  const traineesNeedingRooms = trainees.filter(t =>
    t.allocationStatus === 'allocated' &&
    (!t.roomNumber || t.roomNumber === 'pending')
  );

  console.log(`Found ${traineesNeedingRooms.length} trainees needing room allocation`);

  for (const trainee of traineesNeedingRooms) {
    try {
      console.log(`Processing trainee for room: ${trainee.firstName} ${trainee.surname}`);

      const roomAllocation = await allocateRoomWithBedSpace(trainee.gender);

      if (roomAllocation) {
        // Update trainee with room allocation
        await updateDocument("trainees", trainee.id, {
          roomNumber: roomAllocation.roomNumber,
          roomBlock: roomAllocation.roomBlock,
          bedSpace: roomAllocation.bedSpace,
          allocationStatus: 'allocated'
        });

        console.log(`✓ Allocated room ${roomAllocation.roomNumber} (${roomAllocation.roomBlock}) to ${trainee.firstName} ${trainee.surname}`);

        // Update room status (will be handled in next sync cycle)
        roomsUpdated++;
      } else {
        // Update trainee status if no rooms available
        await updateDocument("trainees", trainee.id, {
          allocationStatus: 'no_rooms'
        });
        noRooms++;
        console.log(`✗ No rooms available for ${trainee.firstName} ${trainee.surname}`);
      }
    } catch (error) {
      console.error(`Error processing trainee ${trainee.id}:`, error);
      inconsistencies++;
    }
  }

  // Step 6: Final status summary
  console.log("Step 6: Generating final summary...");

  const summary = {
    totalTrainees: trainees.length,
    allocatedTrainees: trainees.filter(t => t.allocationStatus === 'allocated').length,
    pendingTrainees: trainees.filter(t => t.allocationStatus === 'pending').length,
    noRoomsTrainees: trainees.filter(t => t.allocationStatus === 'no_rooms').length,
    noTagsTrainees: trainees.filter(t => t.allocationStatus === 'no_tags').length,
    totalRooms: rooms.length,
    availableRooms: rooms.filter(r => r.status === 'available').length,
    occupiedRooms: rooms.filter(r => r.status === 'occupied' || r.status === 'fully_occupied').length,
    totalTags: tagNumbers.length,
    availableTags: tagNumbers.filter(t => t.status === 'available').length,
    assignedTags: tagNumbers.filter(t => t.status === 'assigned').length
  };

  console.log("Synchronization Summary:", {
    allocated,
    noRooms,
    noTags,
    roomsUpdated,
    tagsUpdated,
    inconsistencies,
    summary
  });

  return {
    allocated,
    noRooms,
    noTags,
    roomsUpdated,
    tagsUpdated,
    inconsistencies,
    summary
  };
};

export const getTraineesByAllocationStatus = async (status: 'pending' | 'allocated' | 'no_rooms' | 'no_tags'): Promise<Trainee[]> => {
  return await queryDocuments<Trainee>("trainees", "allocationStatus", "==", status);
};

// Verification code interface
export interface VerificationCode {
  id: string;
  identifier: string;
  code: string;
  expiresAt: Date;
  isUsed: boolean;
  createdAt: Timestamp;
}

export const createVerificationCode = async (identifier: string, code: string): Promise<string> => {
  const verificationCode = {
    identifier,
    code,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    isUsed: false,
    createdAt: Timestamp.now()
  };

  const docRef = await addDoc(collection(db, "verification_codes"), verificationCode);
  return docRef.id;
};

export const getVerificationCode = async (identifier: string, code: string): Promise<VerificationCode | null> => {
  const querySnapshot = await getDocs(query(
    collection(db, "verification_codes"),
    where("identifier", "==", identifier),
    where("code", "==", code),
    where("expiresAt", ">=", new Date()),
    where("isUsed", "==", false)
  ));

  if (querySnapshot.empty) {
    return null;
  }

  const doc = querySnapshot.docs[0];
  const data = doc.data();
  return {
    id: doc.id,
    identifier: data.identifier,
    code: data.code,
    expiresAt: data.expiresAt,
    isUsed: data.isUsed,
    createdAt: data.createdAt
  };
};

export const markVerificationCodeAsUsed = async (codeId: string): Promise<void> => {
  await updateDoc(doc(db, "verification_codes", codeId), {
    isUsed: true,
    usedAt: Timestamp.now()
  });
};

export const cleanupExpiredCodes = async (): Promise<void> => {
  const querySnapshot = await getDocs(query(
    collection(db, "verification_codes"),
    where("expiresAt", "<", new Date())
  ));

  const batch = writeBatch(db);
  querySnapshot.docs.forEach(doc => {
    batch.delete(doc.ref);
  });
  await batch.commit();
};

export const createRoom = async (data: Omit<Room, 'id' | 'createdAt'>): Promise<string> => {
  const cleanData = Object.fromEntries(
    Object.entries(data).filter(([_, value]) => value !== undefined)
  );
  const docRef = await addDoc(collection(db, 'rooms'), {
    ...cleanData,
    createdAt: Timestamp.now()
  });
  return docRef.id;
};

export const createTagNumber = async (data: Omit<TagNumber, 'id' | 'createdAt'>) => {
  const cleanData = Object.fromEntries(
    Object.entries(data).filter(([_, value]) => value !== undefined)
  );
  const docRef = await addDoc(collection(db, 'tagNumbers'), {
    ...cleanData,
    createdAt: Timestamp.now()
  });
  return docRef.id;
};

export const getRooms = async (): Promise<Room[]> => {
  const querySnapshot = await getDocs(collection(db, 'rooms'));
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Room[];
};

export const getTagNumbers = async (): Promise<TagNumber[]> => {
  const querySnapshot = await getDocs(collection(db, 'tagNumbers'));
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as TagNumber[];
};

export const createFacility = async (data: Omit<Facility, 'id' | 'createdAt'>) => {
  const cleanData = Object.fromEntries(
    Object.entries(data).filter(([_, value]) => value !== undefined)
  );
  const docRef = await addDoc(collection(db, 'facilities'), {
    ...cleanData,
    createdAt: Timestamp.now()
  });
  return docRef.id;
};

export const createHousekeepingTask = async (data: Omit<HousekeepingTask, 'id' | 'createdAt'>) => {
  const cleanData = Object.fromEntries(
    Object.entries(data).filter(([_, value]) => value !== undefined)
  );
  const docRef = await addDoc(collection(db, 'housekeepingTasks'), {
    ...cleanData,
    createdAt: Timestamp.now()
  });
  return docRef.id;
};

export const createGuestService = async (data: Omit<GuestService, 'id' | 'createdAt'>) => {
  const cleanData = Object.fromEntries(
    Object.entries(data).filter(([_, value]) => value !== undefined)
  );
  const docRef = await addDoc(collection(db, 'guestServices'), {
    ...cleanData,
    createdAt: Timestamp.now()
  });
  return docRef.id;
};

export const getFacilities = async (): Promise<Facility[]> => {
  const querySnapshot = await getDocs(collection(db, 'facilities'));
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Facility[];
};

export const getHousekeepingTasks = async (): Promise<HousekeepingTask[]> => {
  const querySnapshot = await getDocs(collection(db, 'housekeepingTasks'));
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as HousekeepingTask[];
};

export const getGuestServices = async (): Promise<GuestService[]> => {
  const querySnapshot = await getDocs(collection(db, 'guestServices'));
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as GuestService[];
};

// Delete functions
export const deleteRoom = async (roomId: string): Promise<void> => {
  try {
    console.log('[deleteRoom] Called with roomId:', roomId);
    const roomRef = doc(db, 'rooms', roomId);
    console.log('[deleteRoom] Firestore doc ref:', roomRef.path);

    const roomSnap = await getDoc(roomRef);
    if (!roomSnap.exists()) {
      console.error(`[deleteRoom] Room with ID ${roomId} not found in Firestore.`);
      throw new Error(`Room with ID ${roomId} not found`);
    }
    const roomData = roomSnap.data() as Room;
    console.log('[deleteRoom] Room data:', roomData);

    // Update any trainees using this room
    const traineesSnapshot = await getDocs(
      query(
        collection(db, 'trainees'),
        where('roomNumber', '==', roomData.roomNumber),
        where('roomBlock', '==', roomData.block)
      )
    );
    console.log(`[deleteRoom] Found ${traineesSnapshot.docs.length} trainees using this room.`);
    const updatePromises = traineesSnapshot.docs.map(async (traineeDoc) => {
      const traineeData = traineeDoc.data();
      let newAllocationStatus = 'no_rooms';
      
      // If trainee also has a tag, set status to 'no_rooms', otherwise 'pending'
      if (traineeData.tagNumber && traineeData.tagNumber !== 'pending') {
        newAllocationStatus = 'no_rooms';
      } else {
        newAllocationStatus = 'pending';
      }
      
      await updateDoc(traineeDoc.ref, {
        roomNumber: 'pending',
        roomBlock: 'pending',
        bedSpace: 'pending',
        allocationStatus: newAllocationStatus
      });
      console.log(`[deleteRoom] Updated trainee ${traineeDoc.id} to remove room ${roomData.block}-${roomData.roomNumber}`);
    });
    await Promise.all(updatePromises);

    // Try to delete the room
    try {
      await deleteDoc(roomRef);
      console.log(`[deleteRoom] Successfully deleted room document: ${roomRef.path}`);
    } catch (deleteErr) {
      console.error(`[deleteRoom] Firestore deleteDoc error for ${roomRef.path}:`, deleteErr);
      throw deleteErr;
    }

    // Verify deletion
    const verifySnap = await getDoc(roomRef);
    if (verifySnap.exists()) {
      console.error(`[deleteRoom] Room document still exists after delete: ${roomRef.path}`);
    } else {
      console.log(`[deleteRoom] Room document confirmed deleted: ${roomRef.path}`);
    }
  } catch (error) {
    console.error('[deleteRoom] Error:', error);
    throw error;
  }
};

export const deleteTagNumber = async (tagId: string): Promise<void> => {
  try {
    console.log('[deleteTagNumber] Called with tagId:', tagId);
    const tagRef = doc(db, 'tagNumbers', tagId);
    console.log('[deleteTagNumber] Firestore doc ref:', tagRef.path);

    const tagSnap = await getDoc(tagRef);
    if (!tagSnap.exists()) {
      console.error(`[deleteTagNumber] Tag with ID ${tagId} not found in Firestore.`);
      throw new Error(`Tag with ID ${tagId} not found`);
    }
    const tagData = tagSnap.data() as TagNumber;
    console.log('[deleteTagNumber] Tag data:', tagData);

    // Update any trainees using this tag
    const traineesSnapshot = await getDocs(
      query(
        collection(db, 'trainees'),
        where('tagNumber', '==', tagData.tagNo)
      )
    );
    console.log(`[deleteTagNumber] Found ${traineesSnapshot.docs.length} trainees using this tag.`);
    const updatePromises = traineesSnapshot.docs.map(async (traineeDoc) => {
      await updateDoc(traineeDoc.ref, {
        tagNumber: 'pending',
        allocationStatus: 'no_tags'
      });
      console.log(`[deleteTagNumber] Updated trainee ${traineeDoc.id} to remove tag ${tagData.tagNo}`);
    });
    await Promise.all(updatePromises);

    // Try to delete the tag
    try {
      await deleteDoc(tagRef);
      console.log(`[deleteTagNumber] Successfully deleted tag document: ${tagRef.path}`);
    } catch (deleteErr) {
      console.error(`[deleteTagNumber] Firestore deleteDoc error for ${tagRef.path}:`, deleteErr);
      throw deleteErr;
    }

    // Verify deletion
    const verifySnap = await getDoc(tagRef);
    if (verifySnap.exists()) {
      console.error(`[deleteTagNumber] Tag document still exists after delete: ${tagRef.path}`);
    } else {
      console.log(`[deleteTagNumber] Tag document confirmed deleted: ${tagRef.path}`);
    }
  } catch (error) {
    console.error('[deleteTagNumber] Error:', error);
    throw error;
  }
};

export const migrateExistingTrainees = async (): Promise<void> => {
  const trainees = await getTrainees();

  for (const trainee of trainees) {
    // Check if trainee already has allocationStatus
    if (!trainee.allocationStatus) {
      let allocationStatus: 'pending' | 'allocated' | 'no_rooms' | 'no_tags' = 'pending';

      // Determine status based on existing data
      if (trainee.tagNumber && trainee.tagNumber !== 'pending' &&
          trainee.roomNumber && trainee.roomNumber !== 'pending') {
        allocationStatus = 'allocated';
      } else if (!trainee.tagNumber || trainee.tagNumber === 'pending') {
        allocationStatus = 'no_tags';
      } else if (!trainee.roomNumber || trainee.roomNumber === 'pending') {
        allocationStatus = 'no_rooms';
      }

      // Update trainee with allocation status
      await updateDocument("trainees", trainee.id, {
        allocationStatus,
        bedSpace: trainee.bedSpace || 'pending'
      });
    }
  }
};

// New function to fix allocation status for trainees who have rooms/tags but status is still pending
export const fixAllocationStatus = async (): Promise<{ fixed: number; errors: number }> => {
  const trainees = await getTrainees();
  let fixed = 0;
  let errors = 0;

  console.log(`Starting fixAllocationStatus - found ${trainees.length} trainees`);

  for (const trainee of trainees) {
    try {
      // Check if trainee has both room and tag assigned but status is still pending
      const hasRoom = trainee.roomNumber && trainee.roomNumber !== 'pending';
      const hasTag = trainee.tagNumber && trainee.tagNumber !== 'pending';

      console.log(`Checking trainee ${trainee.firstName} ${trainee.surname}:`, {
        roomNumber: trainee.roomNumber,
        tagNumber: trainee.tagNumber,
        allocationStatus: trainee.allocationStatus,
        hasRoom,
        hasTag
      });

      // Determine what the correct status should be
      let correctStatus: 'pending' | 'allocated' | 'no_rooms' | 'no_tags' = 'pending';
      if (hasRoom && hasTag) {
        correctStatus = 'allocated';
      } else if (hasRoom && !hasTag) {
        correctStatus = 'no_tags';
      } else if (!hasRoom && hasTag) {
        correctStatus = 'no_rooms';
      } else {
        correctStatus = 'pending';
      }

      // Check if status needs to be updated
      const needsUpdate = !trainee.allocationStatus || trainee.allocationStatus !== correctStatus;

      if (needsUpdate) {
        console.log(`Updating trainee ${trainee.firstName} ${trainee.surname} status from '${trainee.allocationStatus}' to '${correctStatus}'`);
        await updateDocument("trainees", trainee.id, {
          allocationStatus: correctStatus
        });
        fixed++;
        console.log(`✅ Updated allocation status for trainee: ${trainee.firstName} ${trainee.surname}`);
      } else {
        console.log(`Trainee ${trainee.firstName} ${trainee.surname} - status is already correct: ${trainee.allocationStatus}`);
      }
    } catch (error) {
      console.error(`❌ Error fixing allocation status for trainee ${trainee.id}:`, error);
      errors++;
    }
  }

  console.log(`fixAllocationStatus completed: ${fixed} fixed, ${errors} errors`);
  return { fixed, errors };
};

// New function to clean up trainee records with invalid room assignments
export const cleanupInvalidRoomAssignments = async (
  onProgress?: (current: number, total: number, status: string) => void
): Promise<{ cleaned: number; errors: number }> => {
  try {
    console.log('[cleanupInvalidRoomAssignments] Starting cleanup...');
    
    // Get all trainees
    onProgress?.(0, 0, 'Fetching trainees...');
    const trainees = await getTrainees();
    console.log(`[cleanupInvalidRoomAssignments] Found ${trainees.length} trainees`);
    
    // Get all existing rooms
    onProgress?.(0, 0, 'Fetching rooms...');
    const rooms = await getAllDocuments<Room>('rooms');
    console.log(`[cleanupInvalidRoomAssignments] Found ${rooms.length} rooms`);
    
    // Create a set of valid room identifiers for quick lookup
    const validRooms = new Set(rooms.map(room => `${room.block}-${room.roomNumber}`));
    
    let cleaned = 0;
    let errors = 0;
    
    onProgress?.(0, trainees.length, 'Checking room assignments...');
    
    for (let i = 0; i < trainees.length; i++) {
      const trainee = trainees[i];
      try {
        onProgress?.(i + 1, trainees.length, `Checking ${trainee.firstName} ${trainee.surname}...`);
        
        // Check if trainee has room assignment
        if (trainee.roomNumber && trainee.roomBlock && 
            trainee.roomNumber !== 'pending' && trainee.roomBlock !== 'pending') {
          
          const roomIdentifier = `${trainee.roomBlock}-${trainee.roomNumber}`;
          
          // Check if this room still exists
          if (!validRooms.has(roomIdentifier)) {
            console.log(`[cleanupInvalidRoomAssignments] Cleaning up trainee ${trainee.firstName} ${trainee.surname} - invalid room: ${roomIdentifier}`);
            
            onProgress?.(i + 1, trainees.length, `Cleaning up ${trainee.firstName} ${trainee.surname}...`);
            
            let newAllocationStatus = 'no_rooms';
            
            // If trainee also has a tag, set status to 'no_rooms', otherwise 'pending'
            if (trainee.tagNumber && trainee.tagNumber !== 'pending') {
              newAllocationStatus = 'no_rooms';
            } else {
              newAllocationStatus = 'pending';
            }
            
            // Update trainee record
            await updateDocument("trainees", trainee.id, {
              roomNumber: 'pending',
              roomBlock: 'pending',
              bedSpace: 'pending',
              allocationStatus: newAllocationStatus
            });
            
            cleaned++;
            console.log(`[cleanupInvalidRoomAssignments] Successfully cleaned up trainee ${trainee.id}`);
          }
        }
      } catch (error) {
        console.error(`[cleanupInvalidRoomAssignments] Error cleaning up trainee ${trainee.id}:`, error);
        errors++;
      }
    }
    
    onProgress?.(trainees.length, trainees.length, 'Cleanup completed!');
    console.log(`[cleanupInvalidRoomAssignments] Cleanup completed. Cleaned: ${cleaned}, Errors: ${errors}`);
    return { cleaned, errors };
    
  } catch (error) {
    console.error('[cleanupInvalidRoomAssignments] Error:', error);
    throw error;
  }
};

// New function to clean up trainee records with invalid tag assignments
export const cleanupInvalidTagAssignments = async (
  onProgress?: (current: number, total: number, status: string) => void
): Promise<{ cleaned: number; errors: number }> => {
  try {
    console.log('[cleanupInvalidTagAssignments] Starting cleanup...');
    
    // Get all trainees
    onProgress?.(0, 0, 'Fetching trainees...');
    const trainees = await getTrainees();
    console.log(`[cleanupInvalidTagAssignments] Found ${trainees.length} trainees`);
    
    // Get all existing tag numbers
    onProgress?.(0, 0, 'Fetching tag numbers...');
    const tagNumbers = await getAllDocuments<TagNumber>('tagNumbers');
    console.log(`[cleanupInvalidTagAssignments] Found ${tagNumbers.length} tag numbers`);
    
    // Create a set of valid tag numbers for quick lookup
    const validTags = new Set(tagNumbers.map(tag => tag.tagNo));
    
    let cleaned = 0;
    let errors = 0;
    
    onProgress?.(0, trainees.length, 'Checking tag assignments...');
    
    for (let i = 0; i < trainees.length; i++) {
      const trainee = trainees[i];
      try {
        onProgress?.(i + 1, trainees.length, `Checking ${trainee.firstName} ${trainee.surname}...`);
        
        // Check if trainee has tag assignment
        if (trainee.tagNumber && trainee.tagNumber !== 'pending') {
          
          // Check if this tag still exists
          if (!validTags.has(trainee.tagNumber)) {
            console.log(`[cleanupInvalidTagAssignments] Cleaning up trainee ${trainee.firstName} ${trainee.surname} - invalid tag: ${trainee.tagNumber}`);
            
            onProgress?.(i + 1, trainees.length, `Cleaning up ${trainee.firstName} ${trainee.surname}...`);
            
            let newAllocationStatus = 'no_tags';
            
            // If trainee also has a room, set status to 'no_tags', otherwise 'pending'
            if (trainee.roomNumber && trainee.roomNumber !== 'pending') {
              newAllocationStatus = 'no_tags';
            } else {
              newAllocationStatus = 'pending';
            }
            
            // Update trainee record
            await updateDocument("trainees", trainee.id, {
              tagNumber: 'pending',
              allocationStatus: newAllocationStatus
            });
            
            cleaned++;
            console.log(`[cleanupInvalidTagAssignments] Successfully cleaned up trainee ${trainee.id}`);
          }
        }
      } catch (error) {
        console.error(`[cleanupInvalidTagAssignments] Error cleaning up trainee ${trainee.id}:`, error);
        errors++;
      }
    }
    
    onProgress?.(trainees.length, trainees.length, 'Cleanup completed!');
    console.log(`[cleanupInvalidTagAssignments] Cleanup completed. Cleaned: ${cleaned}, Errors: ${errors}`);
    return { cleaned, errors };
    
  } catch (error) {
    console.error('[cleanupInvalidTagAssignments] Error:', error);
    throw error;
  }
};

// Staff and Resource Person Registration Functions
export const registerStaff = async (staffData: {
  id: string;
  firstName: string;
  surname: string;
  middleName?: string;
  email: string;
  phoneNumber: string;
  department?: string;
  position?: string;
}) => {
  const staffRegistration = {
    id: staffData.id,
    firstName: staffData.firstName,
    surname: staffData.surname,
    middleName: staffData.middleName,
    email: staffData.email,
    phone: staffData.phoneNumber, // Map phoneNumber to phone
    department: staffData.department,
    position: staffData.position,
    role: "staff" as const,
    isVerified: false,
    createdAt: Timestamp.now()
  };

  // Save to registrations collection
  await createDocument<Staff>("staff_registrations", staffRegistration);
  
  // Also save to main staff collection with the ID as document ID
  const staffDocument = {
    ...staffRegistration,
    bio: "",
    profileImageUrl: "",
    profileImageUpdatedAt: null,
    updatedAt: Timestamp.now()
  };
  
  await createDocumentWithId<Staff>("staff", staffData.id, staffDocument);
  
  return staffRegistration;
};

export const registerResourcePerson = async (rpData: {
  id: string;
  firstName: string;
  surname: string;
  middleName?: string;
  email: string;
  phoneNumber: string;
  specialization?: string;
}) => {
  const resourcePersonRegistration = {
    id: rpData.id,
    firstName: rpData.firstName,
    surname: rpData.surname,
    middleName: rpData.middleName,
    email: rpData.email,
    phone: rpData.phoneNumber, // Map phoneNumber to phone
    specialization: rpData.specialization,
    role: "resource_person" as const,
    isVerified: false,
    createdAt: Timestamp.now()
  };

  return await createDocument<ResourcePerson>("resource_person_registrations", resourcePersonRegistration);
};

export const getStaffRegistrations = async (): Promise<Staff[]> => {
  return await getAllDocuments<Staff>("staff_registrations");
};

export const getResourcePersonRegistrations = async (): Promise<ResourcePerson[]> => {
  try {
    // First try resource_person_registrations collection (primary)
    console.log('Fetching resource persons from collection: resource_person_registrations');
    try {
      const resourcePersons = await getAllDocuments<ResourcePerson>("resource_person_registrations");
      console.log('Raw resource persons data from resource_person_registrations:', resourcePersons);
      if (resourcePersons.length > 0) {
        return resourcePersons;
      }
    } catch (error) {
      console.log('resource_person_registrations collection error:', error);
    }

    // Fallback to resource_persons collection
    console.log('Trying fallback collection: resource_persons');
    try {
      const resourcePersons = await getAllDocuments<ResourcePerson>(RESOURCE_PERSONS_COLLECTION);
      console.log('Raw resource persons data from resource_persons:', resourcePersons);
      if (resourcePersons.length > 0) {
        return resourcePersons;
      }
    } catch (error) {
      console.log('resource_persons collection error:', error);
    }

    // Final fallback to users collection with role filter
    console.log('Trying final fallback: users collection');
    try {
      const users = await getAllDocuments<BaseUser>("users");
      const resourcePersonUsers = users.filter(user => user.role === "resource_person") as ResourcePerson[];
      console.log('Users collection filtered data:', resourcePersonUsers);
      if (resourcePersonUsers.length > 0) {
        return resourcePersonUsers;
      }
    } catch (error) {
      console.log('users collection error:', error);
    }

    console.log('No resource persons found in any collection');
    return [];
  } catch (error) {
    console.error('Error in getResourcePersonRegistrations:', error);
    throw error;
  }
};

export const updateStaffRegistration = async (id: string, data: Partial<Staff>) => {
  return await updateDocument("staff_registrations", id, data);
};

export const updateResourcePersonRegistration = async (id: string, data: Partial<ResourcePerson>) => {
  return await updateDocument(RESOURCE_PERSONS_COLLECTION, id, data);
};

// ID Generation and Validation Functions
export const generateStaffId = async (): Promise<string> => {
  try {
    // Get the last generated staff ID
    const staffIdsQuery = query(
      collection(db, 'generatedIds'),
      where('type', '==', 'staff'),
      orderBy('createdAt', 'desc')
    );

    const staffIdsSnapshot = await getDocs(staffIdsQuery);
    let nextNumber = 1;

    if (!staffIdsSnapshot.empty) {
      // Get all staff IDs and sort them by ID to find the highest number
      const staffIds = staffIdsSnapshot.docs.map(doc => doc.data() as GeneratedId);
      const sortedIds = staffIds.sort((a, b) => {
        const aMatch = a.id.match(/ST-0C0S0S(\d+)/);
        const bMatch = b.id.match(/ST-0C0S0S(\d+)/);
        const aNum = aMatch ? parseInt(aMatch[1]) : 0;
        const bNum = bMatch ? parseInt(bMatch[1]) : 0;
        return bNum - aNum; // Sort in descending order
      });

      if (sortedIds.length > 0) {
        const lastId = sortedIds[0];
        const match = lastId.id.match(/ST-0C0S0S(\d+)/);
        if (match) {
          nextNumber = parseInt(match[1]) + 1;
        }
      }
    }

    const newId = `ST-0C0S0S${nextNumber.toString().padStart(1, '0')}`;

    // Create the generated ID record
    const generatedIdData: Omit<GeneratedId, 'id' | 'createdAt'> = {
      type: 'staff',
      status: 'available'
    };

    await createDocument('generatedIds', {
      ...generatedIdData,
      id: newId
    });

    return newId;
  } catch (error) {
    console.error('Error generating staff ID:', error);
    throw new Error('Failed to generate staff ID');
  }
};

export const generateResourcePersonId = async (): Promise<string> => {
  try {
    // Get the last generated resource person ID
    const rpIdsQuery = query(
      collection(db, 'generatedIds'),
      where('type', '==', 'resource_person')
    );

    const rpIdsSnapshot = await getDocs(rpIdsQuery);
    let nextNumber = 1;

    if (!rpIdsSnapshot.empty) {
      // Get all resource person IDs and sort them by ID to find the highest number
      const rpIds = rpIdsSnapshot.docs.map(doc => doc.data() as GeneratedId);
      const sortedIds = rpIds.sort((a, b) => {
        const aMatch = a.id.match(/RP-0C0S0S(\d+)/);
        const bMatch = b.id.match(/RP-0C0S0S(\d+)/);
        const aNum = aMatch ? parseInt(aMatch[1]) : 0;
        const bNum = bMatch ? parseInt(bMatch[1]) : 0;
        return bNum - aNum; // Sort in descending order
      });

      if (sortedIds.length > 0) {
        const lastId = sortedIds[0];
        const match = lastId.id.match(/RP-0C0S0S(\d+)/);
        if (match) {
          nextNumber = parseInt(match[1]) + 1;
        }
      }
    }

    const newId = `RP-0C0S0S${nextNumber.toString().padStart(1, '0')}`;

    // Create the generated ID record
    const generatedIdData: Omit<GeneratedId, 'id' | 'createdAt'> = {
      type: 'resource_person',
      status: 'available'
    };

    await createDocument('generatedIds', {
      ...generatedIdData,
      id: newId
    });

    // Create a pending resource person record with the specific ID
    const pendingResourcePerson: Omit<ResourcePerson, 'id' | 'createdAt'> = {
      firstName: 'Pending',
      surname: 'Pending',
      middleName: 'Pending',
      email: 'pending@example.com',
      phone: 'Pending',
      role: 'resource_person',
      isVerified: false,
      specialization: 'Pending'
    };

    console.log('Creating pending resource person with ID:', newId);
    console.log('Pending data:', pendingResourcePerson);

    // Create document with specific ID using setDoc instead of addDoc
    const docRef = doc(db, RESOURCE_PERSONS_COLLECTION, newId);
    await setDoc(docRef, {
      ...pendingResourcePerson,
      id: newId,
      createdAt: Timestamp.now()
    });

    console.log('Successfully created pending resource person document');

    return newId;
  } catch (error) {
    console.error('Error generating resource person ID:', error);
    throw new Error('Failed to generate resource person ID');
  }
};

export const validateAndActivateId = async (id: string, email: string): Promise<{ isValid: boolean; message: string; idData?: GeneratedId }> => {
  try {
    // Check if ID exists in generated IDs
    const idQuery = query(
      collection(db, 'generatedIds'),
      where('id', '==', id)
    );

    const idSnapshot = await getDocs(idQuery);

    if (idSnapshot.empty) {
      return {
        isValid: false,
        message: 'ID does not exist or has not been generated.'
      };
    }

    const idData = idSnapshot.docs[0].data() as GeneratedId;

    // Check if ID is already assigned to someone else
    if (idData.status === 'assigned' && idData.assignedTo !== email) {
      return {
        isValid: false,
        message: 'This ID is already assigned to another person.'
      };
    }

    // Check if ID is already activated
    if (idData.status === 'activated') {
      return {
        isValid: false,
        message: 'This ID is already activated and cannot be used again.'
      };
    }

    // Check if user already has an activated ID
    const userQuery = query(
      collection(db, 'generatedIds'),
      where('assignedTo', '==', email),
      where('status', '==', 'activated')
    );

    const userSnapshot = await getDocs(userQuery);
    if (!userSnapshot.empty) {
      return {
        isValid: false,
        message: 'You already have an activated ID. Each person can only have one ID.'
      };
    }

    return {
      isValid: true,
      message: 'ID is valid and available for activation.',
      idData
    };
  } catch (error) {
    console.error('Error validating ID:', error);
    return {
      isValid: false,
      message: 'Error validating ID. Please try again.'
    };
  }
};

export const activateId = async (id: string, email: string): Promise<void> => {
  try {
    // Find the ID document
    const idQuery = query(
      collection(db, 'generatedIds'),
      where('id', '==', id)
    );

    const idSnapshot = await getDocs(idQuery);

    if (idSnapshot.empty) {
      throw new Error('ID not found');
    }

    const idDoc = idSnapshot.docs[0];

    // Update the ID status to assigned
    await updateDoc(idDoc.ref, {
      status: 'assigned',
      assignedTo: email,
      assignedAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Error activating ID:', error);
    throw new Error('Failed to activate ID');
  }
};

export const finalizeIdActivation = async (id: string, userData: any): Promise<void> => {
  try {
    // Find the ID document
    const idQuery = query(
      collection(db, 'generatedIds'),
      where('id', '==', id)
    );

    const idSnapshot = await getDocs(idQuery);

    if (idSnapshot.empty) {
      throw new Error('ID not found');
    }

    const idDoc = idSnapshot.docs[0];

    // Update the ID status to activated
    await updateDoc(idDoc.ref, {
      status: 'activated',
      activatedAt: Timestamp.now()
    });

    // Create the user record
    const userCollection = id.startsWith('ST-') ? 'staff' : 'resourcePersons';
    await createDocument(userCollection, {
      ...userData,
      id: id,
      role: id.startsWith('ST-') ? 'staff' : 'resource_person',
      isVerified: false,
      createdAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Error finalizing ID activation:', error);
    throw new Error('Failed to finalize ID activation');
  }
};

export const getGeneratedIds = async (type?: "staff" | "resource_person"): Promise<GeneratedId[]> => {
  try {
    let q;
    if (type) {
      q = query(
        collection(db, 'generatedIds'),
        where('type', '==', type)
      );
    } else {
      q = query(
        collection(db, 'generatedIds')
      );
    }

    const snapshot = await getDocs(q);
    const ids = snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.data().id // Use the actual ID field from the document, not the document ID
    })) as GeneratedId[];

    // Sort by createdAt in descending order (newest first)
    return ids.sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() || 0;
      const bTime = b.createdAt?.toMillis?.() || 0;
      return bTime - aTime;
    });
  } catch (error) {
    console.error('Error getting generated IDs:', error);
    throw new Error('Failed to get generated IDs');
  }
};

// Evaluation Questions and Responses
export interface EvaluationQuestion {
  id: string;
  question: string;
  type: 'yes_no' | 'single_choice' | 'expression' | 'rating';
  options?: string[];
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface EvaluationResponse {
  id: string;
  traineeId: string;
  traineeName: string;
  traineeEmail: string;
  questionId: string;
  question: string;
  answer: string | number;
  submittedAt: Date;
}

// Evaluation Questions Collection
const EVALUATION_QUESTIONS_COLLECTION = "evaluation_questions";
const EVALUATION_RESPONSES_COLLECTION = "evaluation_responses";

// Get all published evaluation questions
export const getPublishedEvaluationQuestions = async (): Promise<EvaluationQuestion[]> => {
  try {
    console.log('🔍 Starting getPublishedEvaluationQuestions...');
    console.log('🔍 Collection name:', EVALUATION_QUESTIONS_COLLECTION);
    
    // First, let's check if we can access the collection at all
    const collectionRef = collection(db, EVALUATION_QUESTIONS_COLLECTION);
    console.log('🔍 Collection reference created');
    
    // Try to get all questions first (without filter) to see if collection exists
    const allQuestionsQuery = query(collectionRef);
    console.log('🔍 Querying all questions...');
    const allSnapshot = await getDocs(allQuestionsQuery);
    console.log('🔍 Total questions in collection:', allSnapshot.docs.length);
    
    // TEMPORARY WORKAROUND: Get all questions and filter in memory
    // This avoids the composite index requirement while the index is building
    console.log('🔍 Using temporary workaround - filtering in memory...');
    
    const allQuestions = allSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date()
    })) as EvaluationQuestion[];
    
    // Filter published questions in memory
    const publishedQuestions = allQuestions
      .filter(q => q.isPublished === true)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    
    console.log('🔍 Published questions found (filtered):', publishedQuestions.length);
    console.log('🔍 Questions data:', publishedQuestions);
    
    return publishedQuestions;
    
    // ORIGINAL QUERY (uncomment after index is created):
    // const q = query(
    //   collectionRef,
    //   where('isPublished', '==', true),
    //   orderBy('createdAt', 'asc')
    // );
    // console.log('🔍 Querying published questions...');
    // const snapshot = await getDocs(q);
    // console.log('🔍 Published questions found:', snapshot.docs.length);
    // 
    // const questions = snapshot.docs.map(doc => ({
    //   id: doc.id,
    //   ...doc.data(),
    //   createdAt: doc.data().createdAt?.toDate() || new Date(),
    //   updatedAt: doc.data().updatedAt?.toDate() || new Date()
    // })) as EvaluationQuestion[];
    // 
    // console.log('🔍 Processed questions:', questions.length);
    // console.log('🔍 Questions data:', questions);
    // 
    // return questions;
  } catch (error) {
    console.error('❌ Error fetching published evaluation questions:', error);
    
    // More detailed error logging
    if (error instanceof Error) {
      console.error('❌ Error details:', {
        message: error.message,
        name: error.name,
        stack: error.stack
      });
    }
    
    // Check if it's a Firebase auth error
    if (error && typeof error === 'object' && 'code' in error) {
      const firebaseError = error as any;
      console.error('❌ Firebase error code:', firebaseError.code);
      
      if (firebaseError.code === 'permission-denied') {
        throw new Error('Access denied. Please check your authentication.');
      } else if (firebaseError.code === 'unavailable') {
        throw new Error('Firebase service is currently unavailable. Please try again later.');
      } else if (firebaseError.code === 'not-found') {
        throw new Error('Evaluation questions collection not found.');
      } else if (firebaseError.code === 'failed-precondition') {
        throw new Error('Database index is being created. Please try again in a few minutes.');
      }
    }
    
    throw new Error(`Failed to fetch evaluation questions: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Submit evaluation responses
export const submitEvaluationResponses = async (
  traineeId: string,
  traineeName: string,
  traineeEmail: string,
  responses: Array<{ questionId: string; question: string; answer: string | number }>
): Promise<void> => {
  try {
    const batch = writeBatch(db);
    const timestamp = Timestamp.now();

    responses.forEach((response, index) => {
      const responseRef = doc(collection(db, EVALUATION_RESPONSES_COLLECTION));
      batch.set(responseRef, {
        id: responseRef.id,
        traineeId,
        traineeName,
        traineeEmail,
        questionId: response.questionId,
        question: response.question,
        answer: response.answer,
        submittedAt: timestamp
      });
    });

    await batch.commit();
  } catch (error) {
    console.error('Error submitting evaluation responses:', error);
    throw new Error('Failed to submit evaluation responses');
  }
};

// Check if trainee has already submitted evaluation
export const checkTraineeEvaluationSubmission = async (traineeId: string): Promise<boolean> => {
  try {
    const q = query(
      collection(db, EVALUATION_RESPONSES_COLLECTION),
      where('traineeId', '==', traineeId),
      limit(1)
    );
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  } catch (error) {
    console.error('Error checking trainee evaluation submission:', error);
    return false;
  }
};

// Get evaluation responses for admin dashboard
export const getEvaluationResponses = async (): Promise<EvaluationResponse[]> => {
  try {
    const q = query(
      collection(db, EVALUATION_RESPONSES_COLLECTION),
      orderBy('submittedAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      submittedAt: doc.data().submittedAt?.toDate() || new Date()
    })) as EvaluationResponse[];
  } catch (error) {
    console.error('Error fetching evaluation responses:', error);
    throw new Error('Failed to fetch evaluation responses');
  }
};