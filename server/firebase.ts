import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

// Parse service account credentials from environment variable
const serviceAccount = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON || '{}');

// Initialize Firebase Admin SDK
let app;
if (getApps().length === 0) {
  app = initializeApp({
    credential: cert(serviceAccount),
    storageBucket: 'trms-4f542.firebasestorage.app'
  });
} else {
  app = getApps()[0];
}

// Get Firestore and Storage instances
const db = getFirestore(app);
const storage = getStorage(app);

export { db, storage };
export default app;