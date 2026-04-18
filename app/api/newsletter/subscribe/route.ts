import { NextResponse } from 'next/server';
import { adminDb, adminFieldValue } from '@/lib/server/firebase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 8;
const requestBuckets = new Map<string, number[]>();

function getClientIp(request: Request) {
  const forwardedFor = (request.headers.get('x-forwarded-for') || '').split(',')[0]?.trim();
  const realIp = (request.headers.get('x-real-ip') || '').trim();
  return forwardedFor || realIp || 'unknown';
}

function cleanOldRequests(entries: number[], now: number) {
  return entries.filter((time) => now - time <= RATE_LIMIT_WINDOW_MS);
}

function isRateLimited(ip: string) {
  const now = Date.now();
  const current = requestBuckets.get(ip) || [];
  const recent = cleanOldRequests(current, now);
  recent.push(now);
  requestBuckets.set(ip, recent);
  return recent.length > RATE_LIMIT_MAX_REQUESTS;
}

function validateOrigin(request: Request) {
  const origin = (request.headers.get('origin') || '').trim();
  if (!origin) {
    return true;
  }

  const host = (request.headers.get('x-forwarded-host') || request.headers.get('host') || '').trim();
  if (!host) {
    return true;
  }

  try {
    const originUrl = new URL(origin);
    const normalizedOriginHost = originUrl.host.toLowerCase();
    const normalizedHost = host.toLowerCase();
    if (normalizedOriginHost === normalizedHost) {
      return true;
    }
    const originHostname = originUrl.hostname.toLowerCase();
    const hostWithoutPort = normalizedHost.split(':')[0] || normalizedHost;
    return originHostname === hostWithoutPort;
  } catch {
    return false;
  }
}

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
    if (!validateOrigin(request)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Request origin is not allowed.',
        },
        { status: 403, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const ip = getClientIp(request);
    if (isRateLimited(ip)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Too many subscribe attempts. Please wait a minute and try again.',
        },
        { status: 429, headers: { 'Cache-Control': 'no-store' } }
      );
    }

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
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
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
        }, { headers: { 'Cache-Control': 'no-store' } });
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

    return NextResponse.json(
      {
        success: true,
        duplicate: false,
        message: 'Subscription successful.',
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error || 'Unknown error');
    console.error('[newsletter-subscribe] failed', { message });
    return NextResponse.json(
      {
        success: false,
        error: 'Subscription failed due to a server issue. Please try again.',
      },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
