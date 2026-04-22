import type { DecodedIdToken } from 'firebase-admin/auth';
import { adminAuth, adminDb, getFirebaseAdminInitDiagnostics } from './firebase-admin';
import { ApiError } from './http';

const ADMIN_EMAIL = 'technicalhammad39@gmail.com';

function extractHeaderBearerToken(request: Request) {
  const header = request.headers.get('authorization') || request.headers.get('Authorization');

  if (!header || !header.startsWith('Bearer ')) {
    return '';
  }

  return header.replace('Bearer ', '').trim();
}

function extractQueryToken(request: Request) {
  const url = new URL(request.url);
  return (url.searchParams.get('token') || '').trim();
}

function extractAuthToken(request: Request, allowQueryToken = false) {
  const headerToken = extractHeaderBearerToken(request);
  if (headerToken) {
    return headerToken;
  }

  if (allowQueryToken) {
    const queryToken = extractQueryToken(request);
    if (queryToken) {
      return queryToken;
    }
  }

  throw new ApiError(401, 'Missing authentication token');
}

export function isStaffRole(role: unknown) {
  const value = typeof role === 'string' ? role.trim().toLowerCase() : '';
  return value === 'admin' || value === 'manager' || value === 'staff';
}

export async function getUserRole(uid: string) {
  const profileDoc = await adminDb.collection('users').doc(uid).get();
  const role = profileDoc.data()?.role;
  return typeof role === 'string' ? role.trim().toLowerCase() : '';
}

export async function canManageUploads(uid: string, email?: string | null) {
  if ((email || '').toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
    return true;
  }

  const role = await getUserRole(uid);
  return isStaffRole(role);
}

export async function requireAuth(
  request: Request,
  options?: { allowQueryToken?: boolean }
): Promise<DecodedIdToken> {
  const token = extractAuthToken(request, options?.allowQueryToken === true);
  try {
    return await adminAuth.verifyIdToken(token);
  } catch (error: any) {
    const code = String(error?.code || 'unknown');
    const message = String(error?.message || '');
    const adminInit = getFirebaseAdminInitDiagnostics();

    console.error('[auth] Firebase token verification failed', {
      code,
      message,
      adminInit,
      allowQueryToken: options?.allowQueryToken === true,
    });

    const publicMessage =
      code === 'auth/id-token-expired'
        ? 'Authentication token expired. Please sign in again.'
        : 'Authentication token verification failed. Please sign in again.';

    throw new ApiError(401, publicMessage);
  }
}

export async function requireAdmin(request: Request): Promise<DecodedIdToken> {
  const decoded = await requireAuth(request);

  if (decoded.email === ADMIN_EMAIL) {
    return decoded;
  }

  const profileDoc = await adminDb.collection('users').doc(decoded.uid).get();
  const role = profileDoc.data()?.role;

  if (role !== 'admin') {
    throw new ApiError(403, 'Admin access required');
  }

  return decoded;
}

export async function requireStaff(request: Request): Promise<DecodedIdToken> {
  const decoded = await requireAuth(request);

  if (decoded.email === ADMIN_EMAIL) {
    return decoded;
  }

  const role = await getUserRole(decoded.uid);

  if (role !== 'admin' && role !== 'manager') {
    throw new ApiError(403, 'Staff access required');
  }

  return decoded;
}
