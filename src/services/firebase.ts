/**
 * Pearlexperiences - Live Firebase Modular SDK Integration
 * Configured with Firebase Project: perlevents-8897a
 * Realtime Database & Firebase Authentication active.
 */

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
  Auth,
} from 'firebase/auth';
import {
  getDatabase,
  ref,
  set,
  get,
  update,
  onValue,
  off,
  Database,
} from 'firebase/database';
import { getAnalytics, isSupported } from 'firebase/analytics';

// ============================================================================
// LIVE FIREBASE PROJECT CONFIGURATION (perlevents-8897a)
// ============================================================================
export const firebaseConfig = {
  apiKey: "AIzaSyBxnAWlXCV5AGnbWIKzgvlw09UIDPVMWRc",
  authDomain: "perlevents-8897a.firebaseapp.com",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://perlevents-8897a-default-rtdb.firebaseio.com",
  projectId: "perlevents-8897a",
  storageBucket: "perlevents-8897a.firebasestorage.app",
  messagingSenderId: "814985450267",
  appId: "1:814985450267:web:3047f51b28a3ab9918f9be",
  measurementId: "G-H7NQ40YKNC"
};

/**
 * Validates active Firebase credentials
 */
export const isFirebaseConfigured = (): boolean => {
  return (
    Boolean(firebaseConfig.apiKey) &&
    firebaseConfig.apiKey.startsWith("AIzaSy") &&
    firebaseConfig.projectId === "perlevents-8897a"
  );
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let database: Database | null = null;

try {
  if (isFirebaseConfigured()) {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(app);
    database = getDatabase(app);

    if (typeof window !== 'undefined') {
      isSupported().then((supported) => {
        if (supported && app) {
          getAnalytics(app);
        }
      }).catch(() => {});
    }

    console.info('Pearlexperiences: Connected to Firebase Project [perlevents-8897a] (Auth & Realtime Database).');
  }
} catch (error) {
  console.warn('Firebase initialization notice:', error);
}

export { app, auth, database };

/**
 * Signs in a user with Firebase Authentication (Email & Password).
 * If user does not exist yet in Firebase Auth, attempts creation automatically.
 */
export async function authenticateWithFirebase(
  email: string,
  password: string
): Promise<{ success: boolean; user?: FirebaseUser; error?: string }> {
  if (!isFirebaseConfigured() || !auth) {
    return { success: false, error: 'Firebase not configured with active credentials.' };
  }

  const cleanEmail = email.trim().toLowerCase();

  try {
    const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);
    return { success: true, user: userCredential.user };
  } catch (error: any) {
    console.warn('Firebase signIn notice:', error?.code, error?.message);

    // If user does not exist in Firebase Auth yet, try creating account automatically
    if (
      error?.code === 'auth/user-not-found' ||
      error?.code === 'auth/invalid-credential' ||
      error?.code === 'auth/invalid-login-credentials'
    ) {
      try {
        const createRes = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        console.info('Created and signed in user in Firebase Auth:', createRes.user.email);
        return { success: true, user: createRes.user };
      } catch (createErr: any) {
        console.warn('Firebase user registration notice:', createErr?.code, createErr?.message);
      }
    }

    return { success: false, error: error?.message || 'Firebase sign-in failed' };
  }
}

/**
 * Signs out from Firebase Authentication
 */
export async function signOutFromFirebase(): Promise<void> {
  if (auth) {
    try {
      await firebaseSignOut(auth);
    } catch (e) {
      console.warn('Error during Firebase sign-out:', e);
    }
  }
}

/**
 * Pushes data node to Firebase Realtime Database if connected
 */
export async function writeRealtimeNode(nodePath: string, data: any): Promise<boolean> {
  if (!database || !isFirebaseConfigured()) return false;
  try {
    const nodeRef = ref(database, nodePath);
    await set(nodeRef, data);
    return true;
  } catch (err) {
    console.warn(`Failed writing to Realtime Database at /${nodePath}:`, err);
    return false;
  }
}

/**
 * Subscribes to live changes on a Realtime Database node
 */
export function listenToRealtimeNode(nodePath: string, callback: (snapshotVal: any) => void): () => void {
  if (!database || !isFirebaseConfigured()) return () => {};
  try {
    const nodeRef = ref(database, nodePath);
    const listener = onValue(
      nodeRef,
      (snapshot) => {
        const val = snapshot.val();
        if (val) {
          callback(val);
        }
      },
      (error) => {
        console.warn(`Realtime Database listener notice at /${nodePath}:`, error.message);
      }
    );
    return () => off(nodeRef, 'value', listener);
  } catch (e) {
    console.warn('Realtime Database listen error:', e);
    return () => {};
  }
}
