import { db } from "./firebase";

// Initialize Firebase with sample data
export async function initializeFirebase() {
  try {
    // Create system settings
    await db.collection('systemSettings').doc('registration_enabled').set({
      key: 'registration_enabled',
      value: 'true',
      updatedAt: new Date(),
    });

    await db.collection('systemSettings').doc('staff_registration_enabled').set({
      key: 'staff_registration_enabled',
      value: 'true',
      updatedAt: new Date(),
    });

    await db.collection('systemSettings').doc('rp_registration_enabled').set({
      key: 'rp_registration_enabled',
      value: 'true',
      updatedAt: new Date(),
    });

    // Create sample sponsor
    await db.collection('sponsors').doc('sponsor1').set({
      name: 'CSS FARMS Nigeria',
      description: 'Leading agricultural training organization',
      logoUrl: '',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Create admin user
    await db.collection('users').doc('admin-default').set({
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