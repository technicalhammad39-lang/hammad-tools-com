'use client';

import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { auth } from '@/firebase';
import { getClientFcmToken, subscribeForegroundMessages } from '@/lib/firebase-messaging';

export default function PushNotificationBootstrap() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user || typeof window === 'undefined') {
      return;
    }
    const userId = user.uid;

    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      return;
    }

    let unsubscribeForeground: (() => void) | undefined;

    async function setupPush() {
      const promptKey = `push_prompted_${userId}`;
      const permission = Notification.permission;

      if (permission === 'default' && !localStorage.getItem(promptKey)) {
        localStorage.setItem(promptKey, '1');
        try {
          await Notification.requestPermission();
        } catch {
          return;
        }
      }

      if (Notification.permission !== 'granted') {
        return;
      }

      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      const token = await getClientFcmToken(registration);

      if (token) {
        const idToken = await auth.currentUser?.getIdToken();
        if (idToken) {
          await fetch('/api/push/register', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${idToken}`,
            },
            body: JSON.stringify({ token, platform: 'web' }),
          });
        }
      }

      unsubscribeForeground = await subscribeForegroundMessages((payload) => {
        if (Notification.permission !== 'granted') {
          return;
        }

        const title = payload.notification?.title || 'New Notification';
        const body = payload.notification?.body || 'You have a new update.';
        const link = payload.data?.link || '/dashboard';

        const notification = new Notification(title, {
          body,
          icon: '/favicon.png',
        });

        notification.onclick = () => {
          window.focus();
          window.location.href = link;
        };
      });
    }

    setupPush();

    return () => {
      if (unsubscribeForeground) {
        unsubscribeForeground();
      }
    };
  }, [user]);

  return null;
}

