// Centralized Firebase initialization used by both TraineeTracker and ExamApp
// Do NOT import the Firebase SDK multiple times across the repo—import from this file instead.

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Root Firebase project configuration (trms-4f542)
const firebaseConfig = {
  apiKey: "AIzaSyBx7axnsxE55MKwZBFKOGhzOtFeme8qNoA",
  authDomain: "trms-4f542.firebaseapp.com",
  projectId: "trms-4f542",
  storageBucket: "trms-4f542.firebasestorage.app",
  messagingSenderId: "419302910396",
  appId: "1:419302910396:web:fb29b1e13bb956a4c0e3b9",
  measurementId: "G-R78HR9DLX0",
};

// Initialize
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
export default app;
