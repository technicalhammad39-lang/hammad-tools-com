import { NextResponse } from 'next/server';
import { adminAuth, adminDb, adminFieldValue } from '@/lib/server/firebase-admin';
import { requireAdmin } from '@/lib/server/auth';
import { ApiError, jsonError } from '@/lib/server/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type AllowedRole = 'admin' | 'manager' | 'user';

function sanitizeText(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function normalizeRole(value: unknown): AllowedRole | null {
  if (value === 'admin' || value === 'manager' || value === 'user') {
    return value;
  }
  return null;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(value);
}

async function createUser(body: Record<string, unknown>, adminUid: string) {
  const displayName = sanitizeText(body.name, 120);
  const email = sanitizeText(body.email, 320).toLowerCase();
  const password = sanitizeText(body.password, 128);
  const role = normalizeRole(body.role) || 'user';
  const phone = sanitizeText(body.phone, 40);

  if (!displayName) {
    throw new ApiError(400, 'Name is required.');
  }
  if (!email || !isValidEmail(email)) {
    throw new ApiError(400, 'A valid email is required.');
  }
  if (!password || password.length < 6) {
    throw new ApiError(400, 'Password must be at least 6 characters.');
  }

  let createdUid = '';
  try {
    const createdUser = await adminAuth.createUser({
      email,
      password,
      displayName,
      disabled: false,
    });
    createdUid = createdUser.uid;

    const existingClaims = createdUser.customClaims || {};
    await adminAuth.setCustomUserClaims(createdUid, {
      ...existingClaims,
      role,
      banned: false,
    });

    await adminDb.collection('users').doc(createdUid).set({
      uid: createdUid,
      email,
      displayName,
      photoURL: '',
      role,
      banned: false,
      phone: phone || '',
      createdAt: adminFieldValue.serverTimestamp(),
      updatedAt: adminFieldValue.serverTimestamp(),
      createdByAdminId: adminUid,
    });

    return {
      uid: createdUid,
      email,
      displayName,
      role,
      banned: false,
      phone: phone || '',
    };
  } catch (error) {
    if (createdUid) {
      try {
        await adminAuth.deleteUser(createdUid);
      } catch {
        // Best effort rollback.
      }
    }

    const code = String((error as any)?.code || '');
    if (code.includes('email-already-exists')) {
      throw new ApiError(409, 'Email already exists.');
    }
    if (code.includes('invalid-password')) {
      throw new ApiError(400, 'Password format is invalid.');
    }

    const message = error instanceof Error ? error.message : String(error || 'Unknown error');
    throw new ApiError(500, `Failed to create user: ${message}`);
  }
}

export async function POST(request: Request) {
  try {
    const decoded = await requireAdmin(request);
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const created = await createUser(body, decoded.uid);

    return NextResponse.json({
      success: true,
      user: created,
    });
  } catch (error) {
    return jsonError(error);
  }
}
