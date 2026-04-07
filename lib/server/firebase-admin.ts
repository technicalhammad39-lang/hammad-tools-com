import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, Timestamp, getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { getStorage } from 'firebase-admin/storage';

interface ServiceAccountPayload {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

function tryParseServiceAccount(raw: string): ServiceAccountPayload | null {
  const candidates = [raw, raw.trim().replace(/^['"]|['"]$/g, '')];

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      const projectId = parsed.projectId || parsed.project_id;
      const clientEmail = parsed.clientEmail || parsed.client_email;
      const privateKey = parsed.privateKey || parsed.private_key;

      if (projectId && clientEmail && privateKey) {
        return {
          projectId,
          clientEmail,
          privateKey,
        };
      }
    } catch {
      try {
        const unescaped = candidate.replace(/\\"/g, '"');
        const parsed = JSON.parse(unescaped);
        const projectId = parsed.projectId || parsed.project_id;
        const clientEmail = parsed.clientEmail || parsed.client_email;
        const privateKey = parsed.privateKey || parsed.private_key;

        if (projectId && clientEmail && privateKey) {
          return {
            projectId,
            clientEmail,
            privateKey,
          };
        }
      } catch {
        // continue
      }
    }
  }

  return null;
}

function getServiceAccount(): ServiceAccountPayload | null {
  const serviceAccountJson = process.env.FIREBASE_ADMIN_SDK_JSON;

  if (serviceAccountJson) {
    const parsed = tryParseServiceAccount(serviceAccountJson);
    if (parsed) {
      return {
        projectId: parsed.projectId,
        clientEmail: parsed.clientEmail,
        privateKey: parsed.privateKey?.replace(/\\n/g, '\n'),
      };
    }
  }

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    return null;
  }

  return {
    projectId,
    clientEmail,
    privateKey: privateKey.replace(/\\n/g, '\n'),
  };
}

const serviceAccount = getServiceAccount();

if (!getApps().length) {
  if (serviceAccount) {
    initializeApp({
      credential: cert(serviceAccount),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    });
  } else {
    // Fallback initialization so builds don't fail when env vars are not provided.
    // API routes that require admin auth will still fail at runtime until credentials are configured.
    initializeApp({
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    });
  }
}

export const adminAuth = getAuth();
export const adminDb = getFirestore();
export const adminMessaging = getMessaging();
export const adminStorage = getStorage();
export const adminFieldValue = FieldValue;
export const adminTimestamp = Timestamp;

