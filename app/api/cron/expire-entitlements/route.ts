import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/server/firebase-admin';
import { notifyUsers } from '@/lib/server/notifications';

function isAuthorized(request: Request) {
  const vercelCron = request.headers.get('x-vercel-cron');
  if (vercelCron === '1') {
    return true;
  }

  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return true;
  }

  const url = new URL(request.url);
  const querySecret = url.searchParams.get('secret');
  const headerSecret = request.headers.get('x-cron-secret');

  return secret === querySecret || secret === headerSecret;
}

export async function GET(request: Request) {
  return runExpiryJob(request);
}

export async function POST(request: Request) {
  return runExpiryJob(request);
}

async function runExpiryJob(request: Request) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const nearExpiryLimit = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const expiredSnapshot = await adminDb
      .collection('entitlements')
      .where('status', '==', 'active')
      .where('expiresAt', '<=', now)
      .get();

    const nearExpirySnapshot = await adminDb
      .collection('entitlements')
      .where('status', '==', 'active')
      .where('expiresAt', '<=', nearExpiryLimit)
      .get();

    const batch = adminDb.batch();

    const expiredByUser = new Map<string, number>();

    expiredSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      const userId = String(data.userId || '');
      if (!userId) {
        return;
      }

      expiredByUser.set(userId, (expiredByUser.get(userId) || 0) + 1);
      batch.update(doc.ref, {
        status: 'expired',
        expiredAt: now,
        updatedAt: now,
      });
    });

    const nearExpiryUserSet = new Set<string>();

    nearExpirySnapshot.docs.forEach((doc) => {
      const data = doc.data();
      const expiresAt = data.expiresAt?.toDate?.() || (data.expiresAt ? new Date(data.expiresAt) : null);
      const userId = String(data.userId || '');
      if (!userId || !expiresAt) {
        return;
      }

      const isAlreadyNearExpiryNotified = Boolean(data.nearExpiryNotifiedAt);
      const isWithinWindow = expiresAt.getTime() > now.getTime() && expiresAt.getTime() <= nearExpiryLimit.getTime();

      if (!isAlreadyNearExpiryNotified && isWithinWindow) {
        nearExpiryUserSet.add(userId);
        batch.update(doc.ref, {
          nearExpiryNotifiedAt: now,
          updatedAt: now,
        });
      }
    });

    await batch.commit();

    const expiryNotifications = Array.from(expiredByUser.entries());
    for (const [userId, count] of expiryNotifications) {
      await notifyUsers([userId], 'user', {
        type: 'subscription_expired',
        title: 'Subscription Expired',
        body: count > 1 ? `${count} subscriptions have expired.` : 'Your subscription has expired.',
        link: '/dashboard',
      });
    }

    const nearExpiryUserIds = Array.from(nearExpiryUserSet);
    if (nearExpiryUserIds.length) {
      await notifyUsers(nearExpiryUserIds, 'user', {
        type: 'subscription_near_expiry',
        title: 'Subscription Expiring Soon',
        body: 'One or more active subscriptions expire within 24 hours.',
        link: '/dashboard',
      });
    }

    return NextResponse.json({
      success: true,
      expiredCount: expiredSnapshot.size,
      nearExpiryNotifiedUsers: nearExpiryUserIds.length,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to run expiry job' }, { status: 500 });
  }
}

