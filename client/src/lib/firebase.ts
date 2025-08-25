// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";

// Your web app's Firebase configuration

const firebaseConfig = {
  apiKey: "AIzaSyBx7axnsxE55MKwZBFKOGhzOtFeme8qNoA",
  authDomain: "trms-4f542.firebaseapp.com",
  projectId: "trms-4f542",
  storageBucket: "trms-4f542.firebasestorage.app",
  messagingSenderId: "419302910396",
  appId: "1:419302910396:web:fb29b1e13bb956a4c0e3b9",
  measurementId: "G-R78HR9DLX0"
};
// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const analytics = getAnalytics(app);

// Set auth persistence
auth.useDeviceLanguage();

export { app };