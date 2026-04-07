import type { DecodedIdToken } from 'firebase-admin/auth';
import { adminAuth, adminDb } from './firebase-admin';
import { ApiError } from './http';

const ADMIN_EMAIL = 'technicalhammad39@gmail.com';

function extractBearerToken(request: Request) {
  const header = request.headers.get('authorization') || request.headers.get('Authorization');

  if (!header || !header.startsWith('Bearer ')) {
    throw new ApiError(401, 'Missing Authorization bearer token');
  }

  return header.replace('Bearer ', '').trim();
}

export async function requireAuth(request: Request): Promise<DecodedIdToken> {
  const token = extractBearerToken(request);
  try {
    return await adminAuth.verifyIdToken(token);
  } catch {
    throw new ApiError(401, 'Invalid or expired authentication token');
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

  const profileDoc = await adminDb.collection('users').doc(decoded.uid).get();
  const role = profileDoc.data()?.role;

  if (role !== 'admin' && role !== 'manager') {
    throw new ApiError(403, 'Staff access required');
  }

  return decoded;
}

