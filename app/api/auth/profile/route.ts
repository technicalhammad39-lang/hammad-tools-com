import { NextResponse } from 'next/server';
import { adminDb, adminFieldValue } from '@/lib/server/firebase-admin';
import { requireAuth } from '@/lib/server/auth';
import { ApiError, jsonError } from '@/lib/server/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type UserRole = 'user' | 'admin' | 'manager';

const ADMIN_EMAIL = 'technicalhammad39@gmail.com';

function sanitizeText(value: unknown, maxLength: number) {
  const normalized = typeof value === 'string' ? value.trim() : '';
  return normalized.slice(0, maxLength);
}

function normalizeRole(value: unknown): UserRole | null {
  if (value === 'admin' || value === 'manager' || value === 'user') {
    return value;
  }
  if (value === 'Admin') {
    return 'admin';
  }
  if (value === 'Manager' || value === 'staff' || value === 'Staff') {
    return 'manager';
  }
  if (value === 'User') {
    return 'user';
  }
  return null;
}

function deriveRoleFromEmail(email: string): UserRole {
  return email.toLowerCase() === ADMIN_EMAIL.toLowerCase() ? 'admin' : 'user';
}

export async function POST(request: Request) {
  try {
    const decoded = await requireAuth(request);
    const email = sanitizeText(decoded.email || '', 320);

    let body: Record<string, unknown> = {};
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      body = {};
    }

    const displayName = sanitizeText(body.displayName, 120);
    const photoURL = sanitizeText(body.photoURL, 1024);
    const userRef = adminDb.collection('users').doc(decoded.uid);
    const existing = await userRef.get();
    const existingRole = normalizeRole(existing.data()?.role);
    const role = existingRole || deriveRoleFromEmail(email);

    const payload: Record<string, unknown> = {
      uid: decoded.uid,
      email,
      displayName,
      photoURL,
      role,
      updatedAt: adminFieldValue.serverTimestamp(),
    };

    if (!existing.exists) {
      payload.createdAt = adminFieldValue.serverTimestamp();
    }

    await userRef.set(payload, { merge: true });

    return NextResponse.json({
      success: true,
      profile: {
        uid: decoded.uid,
        email,
        displayName,
        photoURL,
        role,
      },
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return jsonError(error);
    }

    const message = error instanceof Error ? error.message : String(error);
    console.error('[auth-profile] sync failed', { message });
    return jsonError(new ApiError(500, `Failed to sync user profile: ${message}`));
  }
}
