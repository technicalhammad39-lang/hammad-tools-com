'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '@/firebase';
import { getSafeAuthErrorMessage } from '@/lib/auth-errors';

const ADMIN_EMAIL = 'technicalhammad39@gmail.com';

type UserRole = 'user' | 'admin' | 'manager';

interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: UserRole;
  banned?: boolean;
  bannedAt?: any;
  bannedByAdminId?: string;
  createdAt?: any;
  updatedAt?: any;
}

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  login: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  signupWithEmail: (email: string, pass: string, name: string) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  isAdmin: boolean;
  isManager: boolean;
  isStaff: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function getRoleForEmail(email: string | null | undefined): UserRole {
  if (email && email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
    return 'admin';
  }
  return 'user';
}

function profileFallback(user: FirebaseUser): UserProfile {
  return {
    uid: user.uid,
    email: user.email || '',
    displayName: user.displayName || '',
    photoURL: user.photoURL || '',
    role: getRoleForEmail(user.email),
  };
}

function normalizeRole(value: unknown): UserRole | null {
  if (value === 'admin' || value === 'manager' || value === 'user') {
    return value;
  }
  return null;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message || 'Unknown error';
  }
  return String(error || 'Unknown error');
}

function isPermissionDeniedError(error: unknown) {
  const code = typeof (error as any)?.code === 'string' ? String((error as any).code).toLowerCase() : '';
  const message = getErrorMessage(error).toLowerCase();
  return (
    code.includes('permission-denied') ||
    message.includes('missing or insufficient permissions') ||
    message.includes('insufficient permissions')
  );
}

async function syncUserProfileViaApi(user: FirebaseUser, forcedDisplayName?: string) {
  const token = await user.getIdToken(true);
  const response = await fetch('/api/auth/profile', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      displayName: forcedDisplayName || user.displayName || '',
      photoURL: user.photoURL || '',
    }),
  });

  let payload: any = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok || !payload?.success) {
    const fallback = `Failed to sync user profile (HTTP ${response.status || 500}).`;
    throw new Error((payload?.error || '').trim() || fallback);
  }
}

async function ensureUserProfile(user: FirebaseUser, forcedDisplayName?: string) {
  const ref = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);
  const existingRole = normalizeRole(snap.data()?.role);
  const role = existingRole || getRoleForEmail(user.email);

  const payload: Record<string, unknown> = {
    uid: user.uid,
    email: user.email || '',
    displayName: forcedDisplayName || user.displayName || '',
    photoURL: user.photoURL || '',
    role,
    updatedAt: serverTimestamp(),
  };

  if (!snap.exists()) {
    payload.createdAt = serverTimestamp();
  }

  try {
    await setDoc(ref, payload, { merge: true });
  } catch (error) {
    if (!isPermissionDeniedError(error)) {
      throw error;
    }

    console.warn('Client profile write denied. Falling back to server profile sync.', {
      reason: getErrorMessage(error),
    });

    await syncUserProfileViaApi(user, forcedDisplayName);
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);

      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      if (!nextUser) {
        setProfile(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setProfile(profileFallback(nextUser));

      void ensureUserProfile(nextUser).catch((error) => {
        console.error('Failed to ensure user profile:', error);
      });

      const profileRef = doc(db, 'users', nextUser.uid);
      unsubscribeProfile = onSnapshot(
        profileRef,
        (snapshot) => {
          const nextProfile = snapshot.exists()
            ? (snapshot.data() as UserProfile)
            : profileFallback(nextUser);

          if (nextProfile?.banned) {
            setProfile(nextProfile);
            setLoading(false);
            void signOut(auth).catch((error) => {
              console.error('Failed to sign out banned user:', error);
            });
            return;
          }

          if (snapshot.exists()) {
            setProfile(nextProfile);
          } else {
            setProfile(nextProfile);
          }
          setLoading(false);
        },
        (error) => {
          console.error('Profile listener failed:', error);
          setProfile(profileFallback(nextUser));
          setLoading(false);
        }
      );
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) {
        unsubscribeProfile();
      }
    };
  }, []);

  const login = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Login failed:', error);
      throw new Error(getSafeAuthErrorMessage(error, 'google_login'));
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (error) {
      console.error('Email login failed:', error);
      throw new Error(getSafeAuthErrorMessage(error, 'email_login'));
    }
  };

  const signupWithEmail = async (email: string, pass: string, name: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      await updateProfile(userCredential.user, { displayName: name.trim() });
      await ensureUserProfile(userCredential.user, name.trim()).catch((profileError) => {
        console.error('Profile sync after signup failed:', profileError);
      });
      await userCredential.user.reload();
    } catch (error) {
      console.error('Email signup failed:', error);
      throw new Error(getSafeAuthErrorMessage(error, 'email_signup'));
    }
  };

  const requestPasswordReset = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      console.error('Password reset request failed:', error);
      throw new Error(getSafeAuthErrorMessage(error, 'password_reset'));
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout failed:', error);
      throw new Error(getSafeAuthErrorMessage(error, 'logout'));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        login,
        loginWithEmail,
        signupWithEmail,
        requestPasswordReset,
        logout,
        isAdmin:
          !profile?.banned &&
          (profile?.role === 'admin' || user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()),
        isManager: !profile?.banned && profile?.role === 'manager',
        isStaff:
          !profile?.banned &&
          (profile?.role === 'admin' ||
            profile?.role === 'manager' ||
            user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
