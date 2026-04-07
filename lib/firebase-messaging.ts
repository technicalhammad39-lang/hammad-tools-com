import { app } from '@/firebase';

let isSupportedCache: boolean | null = null;

async function isMessagingSupported() {
  if (isSupportedCache !== null) {
    return isSupportedCache;
  }

  if (typeof window === 'undefined') {
    isSupportedCache = false;
    return false;
  }

  const messagingModule = await import('firebase/messaging');
  isSupportedCache = await messagingModule.isSupported();
  return isSupportedCache;
}

export async function getClientMessaging() {
  const supported = await isMessagingSupported();
  if (!supported) {
    return null;
  }

  const { getMessaging } = await import('firebase/messaging');
  return getMessaging(app);
}

export async function getClientFcmToken(serviceWorkerRegistration: ServiceWorkerRegistration) {
  const messaging = await getClientMessaging();
  if (!messaging) {
    return null;
  }

  const { getToken } = await import('firebase/messaging');
  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

  if (!vapidKey) {
    return null;
  }

  return getToken(messaging, {
    vapidKey,
    serviceWorkerRegistration,
  });
}

export async function subscribeForegroundMessages(
  onPayload: (payload: { notification?: { title?: string; body?: string }; data?: Record<string, string> }) => void
) {
  const messaging = await getClientMessaging();
  if (!messaging) {
    return () => undefined;
  }

  const { onMessage } = await import('firebase/messaging');
  return onMessage(messaging, onPayload);
}

