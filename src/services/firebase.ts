/**
 * Pearlexperiences - Live Firebase Modular SDK Integration
 * Configured with Firebase Project: perlevents-8897a
 * Realtime Database & Firebase Authentication active.
 */

import { initializeApp, getApps, getApp, deleteApp, FirebaseApp } from 'firebase/app';
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
  databaseURL: "https://perlevents-8897a-default-rtdb.firebaseio.com",
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
    database = getDatabase(app, firebaseConfig.databaseURL);

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
 * Creates an employee / user account directly in Firebase Authentication
 * using an auxiliary isolated FirebaseApp instance. This guarantees that the currently
 * logged-in administrator is NOT signed out or replaced in the primary Auth session.
 */
export async function createEmployeeInFirebaseAuth(
  email: string,
  password: string
): Promise<{ success: boolean; uid?: string; error?: string }> {
  if (!isFirebaseConfigured()) {
    return { success: false, error: 'Firebase is not configured.' };
  }

  const cleanEmail = email.trim().toLowerCase();
  const secondaryAppName = `EmployeeProvision_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  let secondaryApp: FirebaseApp | null = null;

  try {
    secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
    const secondaryAuth = getAuth(secondaryApp);
    const cred = await createUserWithEmailAndPassword(secondaryAuth, cleanEmail, password);
    const uid = cred.user.uid;
    try {
      await firebaseSignOut(secondaryAuth);
    } catch (_) {}
    return { success: true, uid };
  } catch (err: any) {
    console.warn('Firebase Auth employee creation notice:', err?.code, err?.message);
    if (err?.code === 'auth/email-already-in-use') {
      return { success: false, error: 'An account with this email address already exists in Firebase Auth.' };
    }
    if (err?.code === 'auth/weak-password') {
      return { success: false, error: 'The password is too weak. Please use at least 6 characters.' };
    }
    return { success: false, error: err?.message || 'Failed to create user in Firebase Auth.' };
  } finally {
    if (secondaryApp) {
      try {
        await deleteApp(secondaryApp);
      } catch (_) {}
    }
  }
}

/**
 * Pushes data node to Firebase Realtime Database if connected.
 * Sanitizes state through JSON serialization to eliminate any undefined values,
 * which are rejected with a fatal error by the Firebase Realtime Database SDK.
 */
export async function writeRealtimeNode(nodePath: string, data: any): Promise<boolean> {
  if (!database || !isFirebaseConfigured()) return false;
  try {
    const nodeRef = ref(database, nodePath);
    const sanitizedData = data === null || data === undefined ? null : JSON.parse(JSON.stringify(data));
    await set(nodeRef, sanitizedData);
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

/**
 * Proactively fetches the full live state from Firebase Realtime Database.
 * Attempts SDK get() first; if connection is delayed or blocked, falls back
 * immediately to HTTPS REST endpoint.
 */
export async function fetchRealtimeState(): Promise<any> {
  if (!isFirebaseConfigured()) return null;

  // 1. Try Firebase SDK get()
  try {
    if (database) {
      const nodeRef = ref(database, 'pearlexperiences/state');
      const snap = await get(nodeRef);
      if (snap.exists()) {
        const val = snap.val();
        if (val && typeof val === 'object') {
          return val;
        }
      }
    }
  } catch (sdkErr) {
    console.warn('Firebase SDK get() notice, trying REST fallback:', sdkErr);
  }

  // 2. HTTPS REST fallback
  try {
    const res = await fetch('https://perlevents-8897a-default-rtdb.firebaseio.com/pearlexperiences/state.json');
    if (res.ok) {
      const data = await res.json();
      if (data && typeof data === 'object') {
        return data;
      }
    }
  } catch (restErr) {
    console.warn('Firebase REST fetch notice:', restErr);
  }

  return null;
}
