import React, { createContext, useContext, useEffect, useState } from 'react';
import { UserProfile, UserRole } from '../types';
import { realtimeEngine } from '../services/realtimeEngine';

interface AuthContextType {
  currentUser: UserProfile | null;
  users: UserProfile[];
  allUsersList: UserProfile[];
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
  }) => { success: boolean; user?: UserProfile; error?: string };
  toggleUserStatus: (uid: string) => { success: boolean; error?: string };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [dbState, setDbState] = useState(realtimeEngine.getState());
  const [currentUid, setCurrentUid] = useState<string>(() => {
    // Default to Admin for testing unless saved
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('perlevents_active_uid');
      if (saved && dbState.users[saved]) return saved;
    }
    return 'usr_admin_01'; // Default Admin
  });

  useEffect(() => {
    const unsubscribe = realtimeEngine.subscribe(() => {
      setDbState(realtimeEngine.getState());
    });
    return unsubscribe;
  }, []);

  const allUsersList = Object.values(dbState.users);
  const currentUser = dbState.users[currentUid] || allUsersList[0] || null;

  const loginAs = (uid: string) => {
    const user = dbState.users[uid];
    if (user) {
      if (!user.isActive) {
        alert('This user account has been deactivated by the Administrator.');
        return;
      }
      setCurrentUid(uid);
      if (typeof window !== 'undefined') {
        localStorage.setItem('perlevents_active_uid', uid);
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
    // Return to Admin or first available user
    const admin = allUsersList.find((u) => u.role === 'admin');
    if (admin) {
      loginAs(admin.uid);
    }
  };

  const provisionEmployee = (data: {
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
    return realtimeEngine.createEmployeeAccount(currentUser, data);
  };

  const toggleUserStatus = (uid: string) => {
    if (!currentUser || currentUser.role !== 'admin') {
      return { success: false, error: 'Unauthorized.' };
    }
    return realtimeEngine.toggleUserStatus(currentUser, uid);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        users: allUsersList,
        allUsersList,
        loginAs,
        switchRole,
        logout,
        provisionEmployee,
        toggleUserStatus,
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
