import { db } from "./firebase";
import { setDoc, doc } from "firebase/firestore";

// Initialize Firebase with sample data
export async function initializeFirebase() {
  try {
    // Create system settings
    await setDoc(doc(db, 'systemSettings', 'registration_enabled'), {
      key: 'registration_enabled',
      value: 'true',
      updatedAt: new Date(),
    });

    // Create sample sponsor
    await setDoc(doc(db, 'sponsors', 'sponsor1'), {
      name: 'CSS FARMS Nigeria',
      description: 'Leading agricultural training organization',
      logoUrl: '',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Create admin user
    await setDoc(doc(db, 'users', 'admin-default'), {
      id: 'admin-default',
      email: 'hoseaephraim50@gmail.com',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log('Firebase collections initialized successfully');
  } catch (error) {
    console.error('Error initializing Firebase:', error);
  }
}