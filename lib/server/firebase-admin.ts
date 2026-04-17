import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { FieldValue, Timestamp, getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getMessaging, type Messaging } from 'firebase-admin/messaging';
import { ApiError } from './http';

const FIREBASE_ADMIN_APP_NAME = 'hammad-tools-admin';
const PRIVATE_KEY_BEGIN = '-----BEGIN PRIVATE KEY-----';
const PRIVATE_KEY_END = '-----END PRIVATE KEY-----';

type FirebaseAdminEnvStatus = {
  FIREBASE_PROJECT_ID: boolean;
  FIREBASE_CLIENT_EMAIL: boolean;
  FIREBASE_PRIVATE_KEY_BASE64: boolean;
  FIREBASE_PRIVATE_KEY: boolean;
  GOOGLE_CLOUD_PROJECT: boolean;
};

type PrivateKeyDiagnostics = {
  source: 'base64' | 'raw' | 'none';
  outerQuotesRemoved: boolean;
  escapedNewlinesReplaced: number;
  escapedCarriageReturnsReplaced: number;
  doubleEscapedNewlinesReplaced: number;
  doubleEscapedCarriageReturnsReplaced: number;
  startsWithBeginMarker: boolean;
  endsWithEndMarker: boolean;
  bodyBase64Valid: boolean;
  lineCountAfterNormalization: number;
  decodedLineCount: number;
};

type FirebaseAdminInitDiagnostics = {
  timestamp: string;
  nodeEnv: string;
  envSource: string;
  usesProcessEnvOnly: boolean;
  initializationAttempted: boolean;
  envStatus: FirebaseAdminEnvStatus;
  missingRequiredEnv: string[];
  privateKeyNormalized: boolean;
  privateKeyHasEscapedNewlines: boolean;
  privateKeyHasPemHeader: boolean;
  privateKeyHasPemFooter: boolean;
  privateKeyBase64DecodeSucceeded: boolean;
  privateKeyBase64DecodeError: string | null;
  privateKeyPemParseSucceeded: boolean;
  privateKeyPemParseError: string | null;
  privateKeyShape: PrivateKeyDiagnostics;
  initializedWithExplicitCert: boolean;
  appName: string | null;
  firebaseProjectId: string | null;
  googleCloudProject: string | null;
  projectIdsMatch: boolean;
  initializationError: string | null;
};

const defaultPrivateKeyDiagnostics: PrivateKeyDiagnostics = {
  source: 'none',
  outerQuotesRemoved: false,
  escapedNewlinesReplaced: 0,
  escapedCarriageReturnsReplaced: 0,
  doubleEscapedNewlinesReplaced: 0,
  doubleEscapedCarriageReturnsReplaced: 0,
  startsWithBeginMarker: false,
  endsWithEndMarker: false,
  bodyBase64Valid: false,
  lineCountAfterNormalization: 0,
  decodedLineCount: 0,
};

const initDiagnostics: FirebaseAdminInitDiagnostics = {
  timestamp: new Date().toISOString(),
  nodeEnv: process.env.NODE_ENV || 'unknown',
  envSource:
    process.env.NODE_ENV === 'production'
      ? 'process.env (production runtime env)'
      : 'process.env (development may be populated by .env.local via Next.js)',
  usesProcessEnvOnly: true,
  initializationAttempted: false,
  envStatus: {
    FIREBASE_PROJECT_ID: false,
    FIREBASE_CLIENT_EMAIL: false,
    FIREBASE_PRIVATE_KEY_BASE64: false,
    FIREBASE_PRIVATE_KEY: false,
    GOOGLE_CLOUD_PROJECT: false,
  },
  missingRequiredEnv: [],
  privateKeyNormalized: false,
  privateKeyHasEscapedNewlines: false,
  privateKeyHasPemHeader: false,
  privateKeyHasPemFooter: false,
  privateKeyBase64DecodeSucceeded: false,
  privateKeyBase64DecodeError: null,
  privateKeyPemParseSucceeded: false,
  privateKeyPemParseError: null,
  privateKeyShape: { ...defaultPrivateKeyDiagnostics },
  initializedWithExplicitCert: false,
  appName: null,
  firebaseProjectId: null,
  googleCloudProject: null,
  projectIdsMatch: false,
  initializationError: null,
};

let adminAppInstance: App | null = null;
let adminInitError: Error | null = null;
let adminInitAttempted = false;

function normalizeEnvValue(value: string | undefined): string {
  return (value || '').trim();
}

function replaceWithCount(input: string, pattern: RegExp, replacement: string) {
  let count = 0;
  const value = input.replace(pattern, () => {
    count += 1;
    return replacement;
  });
  return { value, count };
}

function stripOuterQuotes(input: string) {
  const trimmed = input.trim();
  if (trimmed.length < 2) {
    return { value: trimmed, removed: false };
  }

  const startsWithSingle = trimmed.startsWith("'");
  const endsWithSingle = trimmed.endsWith("'");
  const startsWithDouble = trimmed.startsWith('"');
  const endsWithDouble = trimmed.endsWith('"');

  if ((startsWithSingle && endsWithSingle) || (startsWithDouble && endsWithDouble)) {
    return {
      value: trimmed.slice(1, -1).trim(),
      removed: true,
    };
  }

  return {
    value: trimmed,
    removed: false,
  };
}

function validateBase64Shape(value: string) {
  return /^[A-Za-z0-9+/=]+$/.test(value);
}

type NormalizedPrivateKeyResult = {
  normalizedKey: string;
  diagnostics: PrivateKeyDiagnostics;
  error: string | null;
  hasEscapedNewlines: boolean;
  hasPemHeader: boolean;
  hasPemFooter: boolean;
};

function normalizePrivateKey(rawValue: string, source: 'base64' | 'raw'): NormalizedPrivateKeyResult {
  const diagnostics: PrivateKeyDiagnostics = {
    ...defaultPrivateKeyDiagnostics,
    source,
  };

  const stripped = stripOuterQuotes(rawValue);
  diagnostics.outerQuotesRemoved = stripped.removed;

  let value = stripped.value;

  const hasEscapedNewlines =
    value.includes('\\n') ||
    value.includes('\\r\\n') ||
    value.includes('\\\\n') ||
    value.includes('\\\\r\\\\n');

  const doubleEscapedCRLF = replaceWithCount(value, /\\\\r\\\\n/g, '\n');
  value = doubleEscapedCRLF.value;
  diagnostics.doubleEscapedCarriageReturnsReplaced += doubleEscapedCRLF.count;

  const doubleEscapedLF = replaceWithCount(value, /\\\\n/g, '\n');
  value = doubleEscapedLF.value;
  diagnostics.doubleEscapedNewlinesReplaced += doubleEscapedLF.count;

  const doubleEscapedCR = replaceWithCount(value, /\\\\r/g, '\n');
  value = doubleEscapedCR.value;
  diagnostics.doubleEscapedCarriageReturnsReplaced += doubleEscapedCR.count;

  const escapedCRLF = replaceWithCount(value, /\\r\\n/g, '\n');
  value = escapedCRLF.value;
  diagnostics.escapedCarriageReturnsReplaced += escapedCRLF.count;

  const escapedLF = replaceWithCount(value, /\\n/g, '\n');
  value = escapedLF.value;
  diagnostics.escapedNewlinesReplaced += escapedLF.count;

  const escapedCR = replaceWithCount(value, /\\r/g, '\n');
  value = escapedCR.value;
  diagnostics.escapedCarriageReturnsReplaced += escapedCR.count;

  value = value.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();

  diagnostics.startsWithBeginMarker = value.startsWith(PRIVATE_KEY_BEGIN);
  diagnostics.endsWithEndMarker = /-----END PRIVATE KEY-----\s*$/.test(value);

  const beginIndex = value.indexOf(PRIVATE_KEY_BEGIN);
  const endIndex = value.lastIndexOf(PRIVATE_KEY_END);

  if (beginIndex < 0 || endIndex < 0 || endIndex <= beginIndex) {
    return {
      normalizedKey: value,
      diagnostics,
      error:
        'PEM markers are missing or in invalid order. Ensure the key contains BEGIN/END PRIVATE KEY markers.',
      hasEscapedNewlines,
      hasPemHeader: diagnostics.startsWithBeginMarker,
      hasPemFooter: diagnostics.endsWithEndMarker,
    };
  }

  const base64BodyRaw = value.slice(beginIndex + PRIVATE_KEY_BEGIN.length, endIndex);
  const base64Body = base64BodyRaw.replace(/\s+/g, '');
  diagnostics.bodyBase64Valid = validateBase64Shape(base64Body);

  if (!base64Body || !diagnostics.bodyBase64Valid) {
    return {
      normalizedKey: value,
      diagnostics,
      error: 'PEM body is malformed. Only base64 characters are allowed between BEGIN/END markers.',
      hasEscapedNewlines,
      hasPemHeader: diagnostics.startsWithBeginMarker,
      hasPemFooter: diagnostics.endsWithEndMarker,
    };
  }

  const bodyLines = base64Body.match(/.{1,64}/g) || [base64Body];
  const normalizedKey = `${PRIVATE_KEY_BEGIN}\n${bodyLines.join('\n')}\n${PRIVATE_KEY_END}\n`;

  diagnostics.lineCountAfterNormalization = normalizedKey
    .split('\n')
    .filter((line) => line.trim().length > 0).length;

  return {
    normalizedKey,
    diagnostics,
    error: null,
    hasEscapedNewlines,
    hasPemHeader: true,
    hasPemFooter: true,
  };
}

function decodePrivateKeyFromBase64(rawBase64: string) {
  const stripped = stripOuterQuotes(rawBase64);
  const compact = stripped.value.replace(/\s+/g, '');

  if (!compact) {
    return {
      ok: false,
      value: '',
      error: 'FIREBASE_PRIVATE_KEY_BASE64 is empty after trimming.',
      outerQuotesRemoved: stripped.removed,
      decodedLineCount: 0,
    };
  }

  if (!validateBase64Shape(compact)) {
    return {
      ok: false,
      value: '',
      error: 'FIREBASE_PRIVATE_KEY_BASE64 contains non-base64 characters.',
      outerQuotesRemoved: stripped.removed,
      decodedLineCount: 0,
    };
  }

  try {
    const decoded = Buffer.from(compact, 'base64').toString('utf8').trim();
    const decodedLineCount = decoded.split(/\r?\n/).filter((line) => line.trim().length > 0).length;

    if (!decoded) {
      return {
        ok: false,
        value: '',
        error: 'Decoded FIREBASE_PRIVATE_KEY_BASE64 is empty.',
        outerQuotesRemoved: stripped.removed,
        decodedLineCount,
      };
    }

    return {
      ok: true,
      value: decoded,
      error: null,
      outerQuotesRemoved: stripped.removed,
      decodedLineCount,
    };
  } catch (error: any) {
    return {
      ok: false,
      value: '',
      error: `Base64 decode failed: ${String(error?.message || error || 'Unknown decode error')}`,
      outerQuotesRemoved: stripped.removed,
      decodedLineCount: 0,
    };
  }
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
    `Env presence => FIREBASE_PROJECT_ID:${initDiagnostics.envStatus.FIREBASE_PROJECT_ID}, FIREBASE_CLIENT_EMAIL:${initDiagnostics.envStatus.FIREBASE_CLIENT_EMAIL}, FIREBASE_PRIVATE_KEY_BASE64:${initDiagnostics.envStatus.FIREBASE_PRIVATE_KEY_BASE64}, FIREBASE_PRIVATE_KEY:${initDiagnostics.envStatus.FIREBASE_PRIVATE_KEY}, GOOGLE_CLOUD_PROJECT:${initDiagnostics.envStatus.GOOGLE_CLOUD_PROJECT}`,
  ].join(' ');
}

function initializeFirebaseAdminExplicitly() {
  const firebaseProjectId = normalizeEnvValue(process.env.FIREBASE_PROJECT_ID);
  const clientEmail = normalizeEnvValue(process.env.FIREBASE_CLIENT_EMAIL);
  const privateKeyBase64 = normalizeEnvValue(process.env.FIREBASE_PRIVATE_KEY_BASE64);
  const privateKeyRaw = normalizeEnvValue(process.env.FIREBASE_PRIVATE_KEY);
  const googleCloudProject = normalizeEnvValue(process.env.GOOGLE_CLOUD_PROJECT);

  initDiagnostics.timestamp = new Date().toISOString();
  initDiagnostics.initializationAttempted = true;
  initDiagnostics.privateKeyShape = { ...defaultPrivateKeyDiagnostics };
  initDiagnostics.privateKeyPemParseSucceeded = false;
  initDiagnostics.privateKeyPemParseError = null;
  initDiagnostics.privateKeyBase64DecodeSucceeded = false;
  initDiagnostics.privateKeyBase64DecodeError = null;
  initDiagnostics.privateKeyNormalized = false;
  initDiagnostics.privateKeyHasEscapedNewlines = false;
  initDiagnostics.privateKeyHasPemHeader = false;
  initDiagnostics.privateKeyHasPemFooter = false;

  initDiagnostics.envStatus = {
    FIREBASE_PROJECT_ID: Boolean(firebaseProjectId),
    FIREBASE_CLIENT_EMAIL: Boolean(clientEmail),
    FIREBASE_PRIVATE_KEY_BASE64: Boolean(privateKeyBase64),
    FIREBASE_PRIVATE_KEY: Boolean(privateKeyRaw),
    GOOGLE_CLOUD_PROJECT: Boolean(googleCloudProject),
  };
  initDiagnostics.firebaseProjectId = firebaseProjectId || null;
  initDiagnostics.googleCloudProject = googleCloudProject || null;
  initDiagnostics.projectIdsMatch = Boolean(
    firebaseProjectId && googleCloudProject && firebaseProjectId === googleCloudProject
  );

  const missingRequiredEnv = Object.entries(initDiagnostics.envStatus)
    .filter(([name, present]) => {
      if (name === 'FIREBASE_PRIVATE_KEY_BASE64' || name === 'FIREBASE_PRIVATE_KEY') {
        return false;
      }
      return !present;
    })
    .map(([name]) => name);

  if (!privateKeyBase64 && !privateKeyRaw) {
    missingRequiredEnv.push('FIREBASE_PRIVATE_KEY_BASE64 or FIREBASE_PRIVATE_KEY');
  }

  initDiagnostics.missingRequiredEnv = missingRequiredEnv;

  if (missingRequiredEnv.length > 0) {
    throw buildMissingEnvError(missingRequiredEnv);
  }

  let keySource: 'base64' | 'raw' = privateKeyBase64 ? 'base64' : 'raw';
  let keyCandidate = '';

  if (keySource === 'base64') {
    const decoded = decodePrivateKeyFromBase64(privateKeyBase64);
    initDiagnostics.privateKeyShape.source = 'base64';
    initDiagnostics.privateKeyShape.outerQuotesRemoved = decoded.outerQuotesRemoved;
    initDiagnostics.privateKeyShape.decodedLineCount = decoded.decodedLineCount;

    if (!decoded.ok) {
      initDiagnostics.privateKeyBase64DecodeSucceeded = false;
      initDiagnostics.privateKeyBase64DecodeError = decoded.error;
      throw new Error(`FIREBASE_PRIVATE_KEY_BASE64 decode failed: ${decoded.error}`);
    }

    initDiagnostics.privateKeyBase64DecodeSucceeded = true;
    initDiagnostics.privateKeyBase64DecodeError = null;
    keyCandidate = decoded.value;
  } else {
    initDiagnostics.privateKeyShape.source = 'raw';
    keyCandidate = privateKeyRaw;
  }

  const normalizedPrivateKey = normalizePrivateKey(keyCandidate, keySource);
  initDiagnostics.privateKeyShape = {
    ...initDiagnostics.privateKeyShape,
    ...normalizedPrivateKey.diagnostics,
    source: keySource,
  };
  initDiagnostics.privateKeyHasEscapedNewlines = normalizedPrivateKey.hasEscapedNewlines;
  initDiagnostics.privateKeyNormalized = Boolean(normalizedPrivateKey.normalizedKey);
  initDiagnostics.privateKeyHasPemHeader = normalizedPrivateKey.hasPemHeader;
  initDiagnostics.privateKeyHasPemFooter = normalizedPrivateKey.hasPemFooter;

  if (normalizedPrivateKey.error) {
    throw new Error(`Private key normalization failed (${keySource}): ${normalizedPrivateKey.error}`);
  }

  let credential: ReturnType<typeof cert>;
  try {
    credential = cert({
      projectId: firebaseProjectId,
      clientEmail,
      privateKey: normalizedPrivateKey.normalizedKey,
    });
    initDiagnostics.privateKeyPemParseSucceeded = true;
    initDiagnostics.privateKeyPemParseError = null;
  } catch (error: any) {
    initDiagnostics.privateKeyPemParseSucceeded = false;
    initDiagnostics.privateKeyPemParseError = String(error?.message || error || 'Unknown PEM parse error');
    throw new Error(
      `Private key PEM parse failed after normalization (${keySource}): ${initDiagnostics.privateKeyPemParseError}`
    );
  }

  const appOptions = {
    credential,
    projectId: googleCloudProject,
  };

  const existing = getApps().find((app) => app.name === FIREBASE_ADMIN_APP_NAME);
  adminAppInstance = existing || initializeApp(appOptions, FIREBASE_ADMIN_APP_NAME);

  initDiagnostics.initializedWithExplicitCert = true;
  initDiagnostics.appName = adminAppInstance.name;
  initDiagnostics.initializationError = null;

  console.info('[firebase-admin] initialized with explicit service account', {
    appName: initDiagnostics.appName,
    firebaseProjectId: initDiagnostics.firebaseProjectId,
    googleCloudProject: initDiagnostics.googleCloudProject,
    projectIdsMatch: initDiagnostics.projectIdsMatch,
    envStatus: initDiagnostics.envStatus,
    privateKeySource: initDiagnostics.privateKeyShape.source,
    privateKeyShape: initDiagnostics.privateKeyShape,
    privateKeyBase64DecodeSucceeded: initDiagnostics.privateKeyBase64DecodeSucceeded,
    privateKeyPemParseSucceeded: initDiagnostics.privateKeyPemParseSucceeded,
    envSource: initDiagnostics.envSource,
    nodeEnv: initDiagnostics.nodeEnv,
  });
}

function ensureAdminInitialized() {
  if (adminInitAttempted) {
    return;
  }

  adminInitAttempted = true;

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
        privateKeySource: initDiagnostics.privateKeyShape.source,
        privateKeyNormalized: initDiagnostics.privateKeyNormalized,
        privateKeyHasEscapedNewlines: initDiagnostics.privateKeyHasEscapedNewlines,
        privateKeyHasPemHeader: initDiagnostics.privateKeyHasPemHeader,
        privateKeyHasPemFooter: initDiagnostics.privateKeyHasPemFooter,
        privateKeyBase64DecodeSucceeded: initDiagnostics.privateKeyBase64DecodeSucceeded,
        privateKeyBase64DecodeError: initDiagnostics.privateKeyBase64DecodeError,
        privateKeyPemParseSucceeded: initDiagnostics.privateKeyPemParseSucceeded,
        privateKeyPemParseError: initDiagnostics.privateKeyPemParseError,
        privateKeyShape: initDiagnostics.privateKeyShape,
        firebaseProjectId: initDiagnostics.firebaseProjectId,
        googleCloudProject: initDiagnostics.googleCloudProject,
        projectIdsMatch: initDiagnostics.projectIdsMatch,
        envSource: initDiagnostics.envSource,
        nodeEnv: initDiagnostics.nodeEnv,
      },
    });
  }
}

function requireAdminApp(): App {
  ensureAdminInitialized();

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
  ensureAdminInitialized();
  return {
    ...initDiagnostics,
    envStatus: {
      ...initDiagnostics.envStatus,
    },
    missingRequiredEnv: [...initDiagnostics.missingRequiredEnv],
    privateKeyShape: {
      ...initDiagnostics.privateKeyShape,
    },
  };
}

export const adminApp = createLazyServiceProxy<App>(() => requireAdminApp());
export const adminAuth = createLazyServiceProxy<Auth>(() => getAuth(requireAdminApp()));
export const adminDb = createLazyServiceProxy<Firestore>(() => getFirestore(requireAdminApp()));
export const adminMessaging = createLazyServiceProxy<Messaging>(() => getMessaging(requireAdminApp()));
export const adminFieldValue = FieldValue;
export const adminTimestamp = Timestamp;
