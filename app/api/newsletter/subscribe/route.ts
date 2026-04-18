import { NextResponse } from 'next/server';
import { adminDb, adminFieldValue } from '@/lib/server/firebase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

function normalizeText(value: unknown, maxLength: number) {
  const text = typeof value === 'string' ? value.trim() : '';
  return text.slice(0, maxLength);
}

function normalizeEmail(value: unknown) {
  return normalizeText(value, 320).toLowerCase();
}

function toDocId(email: string) {
  return email.replace(/\//g, '_');
}

export async function POST(request: Request) {
  try {
    let body: Record<string, unknown> = {};
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      body = {};
    }

    const email = normalizeEmail(body.email);
    const source = normalizeText(body.source, 120) || 'footer';
    const pagePath = normalizeText(body.pagePath, 240);

    if (!email || !EMAIL_REGEX.test(email)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Please enter a valid email address.',
        },
        { status: 400 }
      );
    }

    const ref = adminDb.collection('newsletter_subscribers').doc(toDocId(email));
    const existing = await ref.get();

    if (existing.exists) {
      await ref.set(
        {
          email,
          source,
          pagePath: pagePath || null,
          status: 'active',
          updatedAt: adminFieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      return NextResponse.json({
        success: true,
        duplicate: true,
        message: 'You are already subscribed.',
      });
    }

    await ref.set({
      email,
      source,
      pagePath: pagePath || null,
      status: 'active',
      subscribedAt: adminFieldValue.serverTimestamp(),
      createdAt: adminFieldValue.serverTimestamp(),
      updatedAt: adminFieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      duplicate: false,
      message: 'Subscription successful.',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error || 'Unknown error');
    console.error('[newsletter-subscribe] failed', { message });
    return NextResponse.json(
      {
        success: false,
        error: `Failed to subscribe: ${message}`,
      },
      { status: 500 }
    );
  }
}
