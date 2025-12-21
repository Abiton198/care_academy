// firebase.js

// Import Firebase SDKs
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getStorage } from "firebase/storage";

// ✅ Firebase config from Vite environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// 🔎 Log only in development to check env values
if (import.meta.env.DEV) {
  console.log("Firebase Config:", firebaseConfig);
}

// ✅ Initialize Firebase
const app = initializeApp(firebaseConfig);

// ✅ Initialize Analytics only in browser
let analytics;
if (typeof window !== "undefined" && firebaseConfig.measurementId) {
  try {
    analytics = getAnalytics(app);
  } catch (err) {
    console.warn("Analytics not initialized:", err);
  }
}

// ✅ Initialize other services
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

// ✅ Export
export const googleProvider = new GoogleAuthProvider();
export { app, analytics, db, auth, storage };
