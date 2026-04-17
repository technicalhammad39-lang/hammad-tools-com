import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { FieldValue, Timestamp, getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getMessaging, type Messaging } from 'firebase-admin/messaging';
import { ApiError } from './http';

const FIREBASE_ADMIN_APP_NAME = 'hammad-tools-admin';

type FirebaseAdminEnvStatus = {
  FIREBASE_PROJECT_ID: boolean;
  FIREBASE_CLIENT_EMAIL: boolean;
  FIREBASE_PRIVATE_KEY: boolean;
  GOOGLE_CLOUD_PROJECT: boolean;
};

type FirebaseAdminInitDiagnostics = {
  timestamp: string;
  envStatus: FirebaseAdminEnvStatus;
  missingRequiredEnv: string[];
  privateKeyNormalized: boolean;
  privateKeyHasEscapedNewlines: boolean;
  privateKeyHasPemHeader: boolean;
  initializedWithExplicitCert: boolean;
  appName: string | null;
  firebaseProjectId: string | null;
  googleCloudProject: string | null;
  initializationError: string | null;
};

const initDiagnostics: FirebaseAdminInitDiagnostics = {
  timestamp: new Date().toISOString(),
  envStatus: {
    FIREBASE_PROJECT_ID: false,
    FIREBASE_CLIENT_EMAIL: false,
    FIREBASE_PRIVATE_KEY: false,
    GOOGLE_CLOUD_PROJECT: false,
  },
  missingRequiredEnv: [],
  privateKeyNormalized: false,
  privateKeyHasEscapedNewlines: false,
  privateKeyHasPemHeader: false,
  initializedWithExplicitCert: false,
  appName: null,
  firebaseProjectId: null,
  googleCloudProject: null,
  initializationError: null,
};

let adminAppInstance: App | null = null;
let adminInitError: Error | null = null;

function normalizeEnvValue(value: string | undefined): string {
  return (value || '').trim();
}

function normalizePrivateKey(rawValue: string) {
  const trimmed = rawValue.trim().replace(/^['\"]|['\"]$/g, '');
  const hasEscapedNewlines = trimmed.includes('\\n');
  const normalized = trimmed.replace(/\\n/g, '\n');
  const hasPemHeader = normalized.includes('-----BEGIN PRIVATE KEY-----');

  return {
    normalized,
    hasEscapedNewlines,
    hasPemHeader,
  };
}

function buildMissingEnvError(missingVars: string[]) {
  return new Error(
    `Firebase Admin initialization failed: missing required env vars: ${missingVars.join(', ')}`
  );
}

function buildInitErrorMessage(reason: string) {
  return [
    'Firebase Admin initialization failed.',
    reason,
    `Env presence => FIREBASE_PROJECT_ID:${initDiagnostics.envStatus.FIREBASE_PROJECT_ID}, FIREBASE_CLIENT_EMAIL:${initDiagnostics.envStatus.FIREBASE_CLIENT_EMAIL}, FIREBASE_PRIVATE_KEY:${initDiagnostics.envStatus.FIREBASE_PRIVATE_KEY}, GOOGLE_CLOUD_PROJECT:${initDiagnostics.envStatus.GOOGLE_CLOUD_PROJECT}`,
  ].join(' ');
}

function initializeFirebaseAdminExplicitly() {
  const firebaseProjectId = normalizeEnvValue(process.env.FIREBASE_PROJECT_ID);
  const clientEmail = normalizeEnvValue(process.env.FIREBASE_CLIENT_EMAIL);
  const privateKeyRaw = normalizeEnvValue(process.env.FIREBASE_PRIVATE_KEY);
  const googleCloudProject = normalizeEnvValue(process.env.GOOGLE_CLOUD_PROJECT);

  initDiagnostics.envStatus = {
    FIREBASE_PROJECT_ID: Boolean(firebaseProjectId),
    FIREBASE_CLIENT_EMAIL: Boolean(clientEmail),
    FIREBASE_PRIVATE_KEY: Boolean(privateKeyRaw),
    GOOGLE_CLOUD_PROJECT: Boolean(googleCloudProject),
  };
  initDiagnostics.firebaseProjectId = firebaseProjectId || null;
  initDiagnostics.googleCloudProject = googleCloudProject || null;

  const missingRequiredEnv = Object.entries(initDiagnostics.envStatus)
    .filter(([, present]) => !present)
    .map(([name]) => name);
  initDiagnostics.missingRequiredEnv = missingRequiredEnv;

  if (missingRequiredEnv.length > 0) {
    throw buildMissingEnvError(missingRequiredEnv);
  }

  const normalizedPrivateKey = normalizePrivateKey(privateKeyRaw);
  initDiagnostics.privateKeyHasEscapedNewlines = normalizedPrivateKey.hasEscapedNewlines;
  initDiagnostics.privateKeyNormalized = Boolean(normalizedPrivateKey.normalized);
  initDiagnostics.privateKeyHasPemHeader = normalizedPrivateKey.hasPemHeader;

  if (!normalizedPrivateKey.normalized || !normalizedPrivateKey.hasPemHeader) {
    throw new Error('FIREBASE_PRIVATE_KEY is malformed after normalization (missing PEM header).');
  }

  const appOptions = {
    credential: cert({
      projectId: firebaseProjectId,
      clientEmail,
      privateKey: normalizedPrivateKey.normalized,
    }),
    projectId: googleCloudProject,
  };

  const existing = getApps().find((app) => app.name === FIREBASE_ADMIN_APP_NAME);
  adminAppInstance = existing || initializeApp(appOptions, FIREBASE_ADMIN_APP_NAME);

  initDiagnostics.initializedWithExplicitCert = true;
  initDiagnostics.appName = adminAppInstance.name;

  console.info('[firebase-admin] initialized with explicit service account', {
    appName: initDiagnostics.appName,
    firebaseProjectId: initDiagnostics.firebaseProjectId,
    googleCloudProject: initDiagnostics.googleCloudProject,
    privateKeyHasEscapedNewlines: initDiagnostics.privateKeyHasEscapedNewlines,
    privateKeyHasPemHeader: initDiagnostics.privateKeyHasPemHeader,
    envStatus: initDiagnostics.envStatus,
  });
}

try {
  initializeFirebaseAdminExplicitly();
} catch (error: any) {
  adminInitError = error instanceof Error ? error : new Error(String(error));
  initDiagnostics.initializedWithExplicitCert = false;
  initDiagnostics.initializationError = adminInitError.message;
  console.error('[firebase-admin] initialization failed', {
    error: adminInitError.message,
    diagnostics: {
      envStatus: initDiagnostics.envStatus,
      missingRequiredEnv: initDiagnostics.missingRequiredEnv,
      privateKeyNormalized: initDiagnostics.privateKeyNormalized,
      privateKeyHasEscapedNewlines: initDiagnostics.privateKeyHasEscapedNewlines,
      privateKeyHasPemHeader: initDiagnostics.privateKeyHasPemHeader,
      firebaseProjectId: initDiagnostics.firebaseProjectId,
      googleCloudProject: initDiagnostics.googleCloudProject,
    },
  });
}

function requireAdminApp(): App {
  if (adminAppInstance) {
    return adminAppInstance;
  }

  const reason = adminInitError?.message || 'Unknown initialization failure.';
  throw new ApiError(500, buildInitErrorMessage(reason));
}

function createLazyServiceProxy<T extends object>(factory: () => T): T {
  return new Proxy({} as T, {
    get(_target, prop) {
      const instance = factory() as any;
      const value = instance[prop];
      return typeof value === 'function' ? value.bind(instance) : value;
    },
    set(_target, prop, value) {
      const instance = factory() as any;
      instance[prop] = value;
      return true;
    },
  });
}

export function getFirebaseAdminInitDiagnostics(): FirebaseAdminInitDiagnostics {
  return {
    ...initDiagnostics,
    envStatus: {
      ...initDiagnostics.envStatus,
    },
    missingRequiredEnv: [...initDiagnostics.missingRequiredEnv],
  };
}

export const adminApp = createLazyServiceProxy<App>(() => requireAdminApp());
export const adminAuth = createLazyServiceProxy<Auth>(() => getAuth(requireAdminApp()));
export const adminDb = createLazyServiceProxy<Firestore>(() => getFirestore(requireAdminApp()));
export const adminMessaging = createLazyServiceProxy<Messaging>(() => getMessaging(requireAdminApp()));
export const adminFieldValue = FieldValue;
export const adminTimestamp = Timestamp;


