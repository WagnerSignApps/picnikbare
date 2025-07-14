// Firebase initialization for Picnikbare (new project)
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Use environment variables for config (Vercel-ready)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Warn if config is incomplete
const missingKeys = Object.entries(firebaseConfig).filter(([_, v]) => !v).map(([k]) => k);
if (missingKeys.length > 0) {
  console.error(`Firebase config missing keys: ${missingKeys.join(", ")}`);
  throw new Error(`Firebase config missing keys: ${missingKeys.join(", ")}`);
}

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
