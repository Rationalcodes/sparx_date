import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app"
import { getAuth, type Auth } from "firebase/auth"
import { getFirestore, type Firestore } from "firebase/firestore"
import { getStorage, type FirebaseStorage } from "firebase/storage"

// Safe fallback credentials during static prerendering or CI build phases
// Real credentials will be provided by environment variables in development and production
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDummyPrerenderBuildKey0000000000",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "sparx-date.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "sparx-date",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "sparx-date.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "100000000000",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:100000000000:web:abcdef1234567890",
}

const app: FirebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)
export const auth: Auth = getAuth(app)
export const db: Firestore = getFirestore(app)
export const storage: FirebaseStorage = getStorage(app)
export { app }
