import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/server/firebase-admin';
import { requireAuth } from '@/lib/server/auth';
import { ApiError, jsonError } from '@/lib/server/http';

interface RegisterPushBody {
  token: string;
  platform?: string;
}

export async function POST(request: Request) {
  try {
    const decoded = await requireAuth(request);
    const body = (await request.json()) as RegisterPushBody;

    if (!body.token || typeof body.token !== 'string') {
      throw new ApiError(400, 'Push token is required');
    }

    const token = body.token.trim();
    if (!token) {
      throw new ApiError(400, 'Push token is required');
    }

    const profileSnap = await adminDb.collection('users').doc(decoded.uid).get();
    const roleValue = profileSnap.data()?.role;
    const role = roleValue === 'admin' || roleValue === 'manager' ? 'admin' : 'user';
    const docId = crypto.createHash('sha256').update(token).digest('hex');
    const tokenDocSnap = await adminDb.collection('push_tokens').doc(docId).get();

    await adminDb.collection('push_tokens').doc(docId).set(
      {
        userId: decoded.uid,
        role,
        token,
        platform: typeof body.platform === 'string' ? body.platform : 'web',
        userAgent: request.headers.get('user-agent') || '',
        active: true,
        updatedAt: new Date(),
        createdAt: tokenDocSnap.exists ? tokenDocSnap.data()?.createdAt || new Date() : new Date(),
      },
      { merge: true }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    return jsonError(error);
  }
}

