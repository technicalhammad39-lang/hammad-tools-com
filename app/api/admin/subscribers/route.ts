import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/server/firebase-admin';
import { requireAdmin } from '@/lib/server/auth';
import { ApiError, jsonError } from '@/lib/server/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function toISOStringSafe(value: any) {
  if (!value) return null;
  if (typeof value?.toDate === 'function') {
    const date = value.toDate();
    return date instanceof Date && !Number.isNaN(date.getTime()) ? date.toISOString() : null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export async function GET(request: Request) {
  try {
    await requireAdmin(request);

    const snapshot = await adminDb
      .collection('newsletter_subscribers')
      .orderBy('subscribedAt', 'desc')
      .limit(3000)
      .get();

    const subscribers = snapshot.docs.map((doc) => {
      const data = doc.data() as Record<string, any>;
      return {
        id: doc.id,
        email: typeof data.email === 'string' ? data.email : '',
        source: typeof data.source === 'string' ? data.source : '',
        pagePath: typeof data.pagePath === 'string' ? data.pagePath : '',
        status: typeof data.status === 'string' ? data.status : 'active',
        subscribedAt: toISOStringSafe(data.subscribedAt || data.createdAt),
        updatedAt: toISOStringSafe(data.updatedAt),
      };
    });

    return NextResponse.json(
      {
        success: true,
        count: subscribers.length,
        subscribers,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    if (error instanceof ApiError) {
      return jsonError(error);
    }

    const message = error instanceof Error ? error.message : String(error || 'Unknown error');
    console.error('[admin-subscribers] failed', { message });
    return jsonError(new ApiError(500, `Failed to load newsletter subscribers: ${message}`));
  }
}
