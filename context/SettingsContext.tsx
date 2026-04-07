'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase';

interface GlobalSettings {
  supportEmail: string;
  supportPhone: string;
  whatsappUrl: string;
  facebookUrl: string;
  instagramUrl: string;
  snapchatUrl: string;
  tiktokUrl: string;
  googleBusinessUrl: string;
}

interface SettingsContextType {
  settings: GlobalSettings;
  loading: boolean;
}

const defaultSettings: GlobalSettings = {
  supportEmail: 'hammadkhaksar56@gmail.com',
  supportPhone: '+92 320 9310656',
  whatsappUrl: 'https://whatsapp.com/channel/0029VaoX5ax8V0tjn0fc1j08',
  facebookUrl: 'https://www.facebook.com/share/1DuzaVsvAN/',
  instagramUrl: 'https://www.instagram.com/hammad_khaksar56?',
  snapchatUrl: 'https://www.snapchat.com/add/hammad_khak56',
  tiktokUrl: 'https://www.tiktok.com/@hammad_khaksar',
  googleBusinessUrl: 'https://share.google/sFQ5dERBroxbbbgef',
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
            instagramUrl: data.instagram || prev.instagramUrl,
            snapchatUrl: data.snapchat || prev.snapchatUrl,
            tiktokUrl: data.tiktok || prev.tiktokUrl,
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
