'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase';

interface GlobalSettings {
  supportEmail: string;
  supportPhone: string;
  whatsappUrl: string;
  facebookUrl: string;
  googleBusinessUrl: string;
}

interface SettingsContextType {
  settings: GlobalSettings;
  loading: boolean;
}

const defaultSettings: GlobalSettings = {
  supportEmail: 'hammadkhaksar56@gmail.com',
  supportPhone: '+92 320 9310656',
  whatsappUrl: 'https://wa.me/923209310656',
  facebookUrl: 'https://facebook.com/hammadtools',
  googleBusinessUrl: '#',
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<GlobalSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Listen to General Settings
    const unsubscribeGeneral = onSnapshot(
      doc(db, 'settings', 'general'), 
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setSettings(prev => ({
            ...prev,
            supportEmail: data.contactEmail || prev.supportEmail,
            supportPhone: data.contactPhone || prev.supportPhone,
          }));
        }
      },
      (error) => {
        // Silently catch permission errors for unauthenticated users
        // defaultSettings will be used instead.
      }
    );

    // 2. Listen to Socials Settings
    const unsubscribeSocials = onSnapshot(
      doc(db, 'settings', 'socials'), 
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setSettings(prev => ({
            ...prev,
            whatsappUrl: data.whatsapp || prev.whatsappUrl, 
            facebookUrl: data.facebook || prev.facebookUrl,
            googleBusinessUrl: data.googleBusiness || prev.googleBusinessUrl,
          }));
        }
      },
      (error) => {
        // Silently catch permission errors for unauthenticated users
      }
    );

    setLoading(false);

    return () => {
      unsubscribeGeneral();
      unsubscribeSocials();
    };
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, loading }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
