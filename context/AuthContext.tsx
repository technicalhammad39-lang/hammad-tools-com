'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '@/firebase';

const ADMIN_EMAIL = 'technicalhammad39@gmail.com';

type UserRole = 'user' | 'admin' | 'manager';

interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: UserRole;
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

  await setDoc(ref, payload, { merge: true });
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
          if (snapshot.exists()) {
            setProfile(snapshot.data() as UserProfile);
          } else {
            setProfile(profileFallback(nextUser));
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
      throw error;
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (error) {
      console.error('Email login failed:', error);
      throw error;
    }
  };

  const signupWithEmail = async (email: string, pass: string, name: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      await updateProfile(userCredential.user, { displayName: name.trim() });
      await ensureUserProfile(userCredential.user, name.trim());
      await userCredential.user.reload();
    } catch (error) {
      console.error('Email signup failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout failed:', error);
      throw error;
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
        logout,
        isAdmin: profile?.role === 'admin' || user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase(),
        isManager: profile?.role === 'manager',
        isStaff:
          profile?.role === 'admin' ||
          profile?.role === 'manager' ||
          user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase(),
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
