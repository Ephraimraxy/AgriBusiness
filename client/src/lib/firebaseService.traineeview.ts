import { 
    collection, 
    doc, 
    addDoc, 
    getDocs, 
    getDoc, 
    updateDoc, 
    deleteDoc, 
    query, 
    where, 
    orderBy,
    Timestamp,
    writeBatch
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
    // Removed specialization and experience fields as requested
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
    status: 'available' | 'occupied' | 'partially_occupied' | 'fully_occupied' | 'maintenance';
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
  const USERS_COLLECTION = "users";
  const TRAINEES_COLLECTION = "trainees";
  const STAFF_COLLECTION = "staff";
  const RESOURCE_PERSONS_COLLECTION = "resource_persons";
  const SPONSORS_COLLECTION = "sponsors";
  const BATCHES_COLLECTION = "batches";
  
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
    
    console.log(`[allocateRoomWithBedSpace] Looking for rooms for ${gender} trainee`);
    console.log(`[allocateRoomWithBedSpace] Total rooms: ${rooms.length}`);
    console.log(`[allocateRoomWithBedSpace] Total trainees: ${trainees.length}`);
    
    // Find rooms with available bed space for the given gender
    const availableRooms = rooms.filter(room => {
      // Check if room is available and matches gender block
      const isMaleRoom = room.block === 'A' || room.block === 'B';
      const isFemaleRoom = room.block === 'C' || room.block === 'D';
      
      // Check if room status is available or partially occupied
      const isRoomAvailable = room.status === 'available' || room.status === 'partially_occupied';
      
      if ((gender === 'male' && isMaleRoom) || (gender === 'female' && isFemaleRoom)) {
        // Calculate current occupancy
        const traineesInRoom = trainees.filter(t => 
          t.roomNumber === room.roomNumber && 
          t.roomBlock === room.block
        );
        
        const bedSpaceNumber = parseInt(room.bedSpace) || 1;
        const availableBeds = bedSpaceNumber - traineesInRoom.length;
        
        console.log(`[allocateRoomWithBedSpace] Room ${room.roomNumber} (${room.block}): status=${room.status}, bedSpace=${bedSpaceNumber}, currentOccupancy=${traineesInRoom.length}, availableBeds=${availableBeds}`);
        
        return isRoomAvailable && availableBeds > 0;
      }
      return false;
    });
    
    console.log(`[allocateRoomWithBedSpace] Found ${availableRooms.length} available rooms for ${gender}`);
    
    if (availableRooms.length === 0) {
      console.log(`[allocateRoomWithBedSpace] No available rooms found for ${gender}`);
      return null;
    }
    
    // Sort rooms by block and room number for consistent allocation
    availableRooms.sort((a, b) => {
      if (a.block !== b.block) return a.block.localeCompare(b.block);
      return a.roomNumber.localeCompare(b.roomNumber);
    });
    
    // Get the first available room
    const room = availableRooms[0];
    console.log(`[allocateRoomWithBedSpace] Allocating room ${room.roomNumber} (${room.block}) to ${gender} trainee`);
    
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
    console.log(`Available rooms: ${rooms.filter(r => r.status === 'available').length}`);
    console.log(`Partially occupied rooms: ${rooms.filter(r => r.status === 'partially_occupied').length}`);
    
    for (const trainee of traineesNeedingRooms) {
      try {
        console.log(`Processing trainee for room: ${trainee.firstName} ${trainee.surname} (${trainee.gender})`);
        
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
          console.log(`✗ No rooms available for ${trainee.firstName} ${trainee.surname} (${trainee.gender})`);
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
      ...staffData,
      phone: staffData.phoneNumber, // Map phoneNumber to phone
      role: "staff" as const,
      isVerified: false,
      createdAt: Timestamp.now()
    };
    
    return await createDocument<Staff>("staff_registrations", staffRegistration);
  };
  
  export const registerResourcePerson = async (rpData: {
    id: string;
    firstName: string;
    surname: string;
    middleName?: string;
    email: string;
    phoneNumber: string;
    specialization?: string;
    experience?: string;
  }) => {
    const resourcePersonRegistration = {
      ...rpData,
      phone: rpData.phoneNumber, // Map phoneNumber to phone
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
    return await getAllDocuments<ResourcePerson>("resource_person_registrations");
  };
  
  export const updateStaffRegistration = async (id: string, data: Partial<Staff>) => {
    return await updateDocument<Staff>("staff_registrations", id, data);
  };
  
  export const updateResourcePersonRegistration = async (id: string, data: Partial<ResourcePerson>) => {
    return await updateDocument<ResourcePerson>("resource_person_registrations", id, data);
  };
  
  // ID Generation and Validation Functions
  export const generateStaffId = async (): Promise<string> => {
    try {
      // Get the last generated staff ID
      const staffIdsQuery = query(
        collection(db, 'generatedIds'),
        where('type', '==', 'staff'),
        orderBy('createdAt', 'desc'),
        orderBy('id', 'desc')
      );
      
      const staffIdsSnapshot = await getDocs(staffIdsQuery);
      let nextNumber = 1;
      
      if (!staffIdsSnapshot.empty) {
        const lastId = staffIdsSnapshot.docs[0].data() as GeneratedId;
        const match = lastId.id.match(/ST-0C0S0S(\d+)/);
        if (match) {
          nextNumber = parseInt(match[1]) + 1;
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
        where('type', '==', 'resource_person'),
        orderBy('createdAt', 'desc'),
        orderBy('id', 'desc')
      );
      
      const rpIdsSnapshot = await getDocs(rpIdsQuery);
      let nextNumber = 1;
      
      if (!rpIdsSnapshot.empty) {
        const lastId = rpIdsSnapshot.docs[0].data() as GeneratedId;
        const match = lastId.id.match(/RP-0C0S0S(\d+)/);
        if (match) {
          nextNumber = parseInt(match[1]) + 1;
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
          where('type', '==', type),
          orderBy('createdAt', 'desc')
        );
      } else {
        q = query(
          collection(db, 'generatedIds'),
          orderBy('createdAt', 'desc')
        );
      }
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as GeneratedId[];
    } catch (error) {
      console.error('Error getting generated IDs:', error);
      throw new Error('Failed to get generated IDs');
    }
  };