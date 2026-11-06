import React, { createContext, useContext, useEffect, useState } from 'react';
import { UserProfile, UserRole } from '../types';
import { realtimeEngine } from '../services/realtimeEngine';
import { DEFAULT_USER_CREDENTIALS } from '../services/seedData';
import {
  authenticateWithFirebase,
  signOutFromFirebase,
  isFirebaseConfigured,
  createEmployeeInFirebaseAuth,
} from '../services/firebase';

interface AuthContextType {
  currentUser: UserProfile | null;
  isAuthenticated: boolean;
  users: UserProfile[];
  allUsersList: UserProfile[];
  loginWithEmailPassword: (email: string, password: string) => Promise<{ success: boolean; user?: UserProfile; error?: string }>;
  loginAs: (uid: string) => void;
  switchRole: (role: UserRole) => void;
  logout: () => void;
  provisionEmployee: (data: {
    fullName: string;
    email: string;
    phone?: string;
    role: 'salesperson' | 'manager';
    initialPassword?: string;
    assignedBanquetIds?: string[];
  }) => Promise<{ success: boolean; user?: UserProfile; error?: string }>;
  updateEmployee: (
    uid: string,
    data: {
      fullName?: string;
      email?: string;
      phone?: string;
      role?: 'salesperson' | 'manager';
      assignedBanquetIds?: string[];
    }
  ) => { success: boolean; user?: UserProfile; error?: string };
  toggleUserStatus: (uid: string) => { success: boolean; error?: string };
  deleteEmployee: (uid: string) => { success: boolean; error?: string };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [dbState, setDbState] = useState(realtimeEngine.getState());
  const [currentUid, setCurrentUid] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('pearlexperiences_active_uid');
      if (saved && dbState?.users && dbState.users[saved] && dbState.users[saved].isActive) return saved;
    }
    return null; // Show single login screen if not authenticated
  });

  useEffect(() => {
    const unsubscribe = realtimeEngine.subscribe(() => {
      setDbState(realtimeEngine.getState());
    });
    return unsubscribe;
  }, []);

  const allUsersList = Object.values(dbState?.users || {}).filter(
    (u): u is UserProfile => Boolean(u && typeof u === 'object' && u.uid)
  );
  const currentUser: UserProfile | null =
    currentUid && dbState?.users && dbState.users[currentUid] && dbState.users[currentUid].isActive
      ? dbState.users[currentUid]
      : null;

  /**
   * Unified Single Form Login
   * Resolves user and role based on email & password:
   * - admin@perlexperiences.com / admin123 -> Admin
   * - sales@perlexperiences.com / sales123 -> Salesperson
   * - manager@perlexperiences.com / manager123 -> Manager
   * Also connects to Firebase Auth if user credentials are provided.
   */
  const loginWithEmailPassword = async (
    email: string,
    password: string
  ): Promise<{ success: boolean; user?: UserProfile; error?: string }> => {
    let cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanEmail || !cleanPassword) {
      return { success: false, error: 'Please enter both email and password.' };
    }

    // Support shorthand role aliases
    if (cleanEmail === 'sales' || cleanEmail === 'salesperson') {
      cleanEmail = 'sales@perlexperiences.com';
    } else if (cleanEmail === 'manager') {
      cleanEmail = 'manager@perlexperiences.com';
    } else if (cleanEmail === 'admin') {
      cleanEmail = 'admin@perlexperiences.com';
    }

    // 1. Attempt Firebase Authentication if credentials are configured
    if (isFirebaseConfigured()) {
      try {
        const fbRes = await authenticateWithFirebase(cleanEmail, cleanPassword);
        if (fbRes.success && fbRes.user) {
          // Find matching profile in database or match by email
          const matchedUser = allUsersList.find(
            (u) => u.email.toLowerCase() === cleanEmail || u.uid === fbRes.user?.uid
          );
          if (matchedUser) {
            if (!matchedUser.isActive) {
              return { success: false, error: 'Your Pearlexperiences account is deactivated. Contact Administrator.' };
            }
            setCurrentUid(matchedUser.uid);
            if (typeof window !== 'undefined') {
              localStorage.setItem('pearlexperiences_active_uid', matchedUser.uid);
            }
            return { success: true, user: matchedUser };
          }
        }
      } catch (err) {
        console.warn('Firebase auth attempt error:', err);
      }
    }

    // 2. Validate against standard credentials & local database profiles
    const creds = DEFAULT_USER_CREDENTIALS[cleanEmail];
    let matchedUser: UserProfile | undefined;

    if (creds && creds.password === cleanPassword) {
      matchedUser = dbState?.users?.[creds.uid] || allUsersList.find((u) => u.email.toLowerCase() === cleanEmail);
      if (!matchedUser) {
        matchedUser = {
          uid: creds.uid,
          fullName: creds.name,
          email: creds.email,
          phone: '',
          role: creds.role,
          organizationId: 'org_pearlexperiences',
          isActive: true,
          createdAt: new Date().toISOString(),
          createdBy: 'system',
          updatedAt: new Date().toISOString(),
        };
        if (dbState?.users) {
          dbState.users[creds.uid] = matchedUser;
        }
      }
    } else {
      // Check if user exists in database and password matches default rule
      const userByEmail = allUsersList.find((u) => u.email.toLowerCase() === cleanEmail);
      if (userByEmail) {
        // Expected passwords
        const expectedPwd =
          userByEmail.role === 'admin'
            ? 'admin123'
            : userByEmail.role === 'salesperson'
              ? 'sales123'
              : 'manager123';
        if (cleanPassword === expectedPwd || cleanPassword === (userByEmail as any).initialPassword) {
          matchedUser = userByEmail;
        }
      }
    }

    if (!matchedUser) {
      return {
        success: false,
        error: 'Invalid credentials. Please verify your email and password.',
      };
    }

    if (!matchedUser.isActive) {
      return {
        success: false,
        error: 'This account has been deactivated. Please contact your administrator.',
      };
    }

    setCurrentUid(matchedUser.uid);
    if (typeof window !== 'undefined') {
      localStorage.setItem('pearlexperiences_active_uid', matchedUser.uid);
    }

    return { success: true, user: matchedUser };
  };

  const loginAs = (uid: string) => {
    const user = dbState.users[uid];
    if (user) {
      if (!user.isActive) {
        alert('This user account has been deactivated by the Administrator.');
        return;
      }
      setCurrentUid(uid);
      if (typeof window !== 'undefined') {
        localStorage.setItem('pearlexperiences_active_uid', uid);
      }
    }
  };

  const switchRole = (role: UserRole) => {
    const match = allUsersList.find((u) => u.role === role && u.isActive);
    if (match) {
      loginAs(match.uid);
    } else {
      alert(`No active user found with role: ${role}`);
    }
  };

  const logout = () => {
    signOutFromFirebase();
    setCurrentUid(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('pearlexperiences_active_uid');
    }
  };

  const provisionEmployee = async (data: {
    fullName: string;
    email: string;
    phone?: string;
    role: 'salesperson' | 'manager';
    initialPassword?: string;
    assignedBanquetIds?: string[];
  }) => {
    if (!currentUser || currentUser.role !== 'admin') {
      return { success: false, error: 'Unauthorized: Only an Administrator can create accounts.' };
    }

    const defaultPwd = data.role === 'salesperson' ? 'sales123' : 'manager123';
    const passwordToUse = data.initialPassword || defaultPwd;

    // Create user in live Firebase Auth
    let customUid: string | undefined;
    if (isFirebaseConfigured()) {
      try {
        const fbRes = await createEmployeeInFirebaseAuth(data.email, passwordToUse);
        if (fbRes.success && fbRes.uid) {
          customUid = fbRes.uid;
        } else if (fbRes.error) {
          // If already exists or error, log for diagnostics
          console.warn('Firebase Auth creation notice:', fbRes.error);
        }
      } catch (fbErr) {
        console.warn('Firebase Auth user creation error:', fbErr);
      }
    }

    return realtimeEngine.createEmployeeAccount(currentUser, {
      ...data,
      customUid,
    });
  };

  const updateEmployee = (
    uid: string,
    data: {
      fullName?: string;
      email?: string;
      phone?: string;
      role?: 'salesperson' | 'manager';
      assignedBanquetIds?: string[];
    }
  ) => {
    if (!currentUser || currentUser.role !== 'admin') {
      return { success: false, error: 'Unauthorized: Only an Administrator can edit employee accounts.' };
    }
    return realtimeEngine.updateEmployeeAccount(currentUser, uid, data);
  };

  const toggleUserStatus = (uid: string) => {
    if (!currentUser || currentUser.role !== 'admin') {
      return { success: false, error: 'Unauthorized.' };
    }
    return realtimeEngine.toggleUserStatus(currentUser, uid);
  };

  const deleteEmployee = (uid: string) => {
    if (!currentUser || currentUser.role !== 'admin') {
      return { success: false, error: 'Unauthorized: Only an Administrator can delete employee accounts.' };
    }
    return realtimeEngine.deleteEmployeeAccount(currentUser, uid);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated: currentUser !== null,
        users: allUsersList,
        allUsersList,
        loginWithEmailPassword,
        loginAs,
        switchRole,
        logout,
        provisionEmployee,
        updateEmployee,
        toggleUserStatus,
        deleteEmployee,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
