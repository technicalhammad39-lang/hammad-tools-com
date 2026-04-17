import { NextResponse } from 'next/server';
import { adminDb, adminFieldValue } from '@/lib/server/firebase-admin';
import { requireAuth } from '@/lib/server/auth';
import { ApiError, jsonError } from '@/lib/server/http';
import { getOrderDisplayId, normalizeOrderStatus } from '@/lib/order-system';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ADMIN_EMAIL = 'technicalhammad39@gmail.com';

function isStaffRole(role: unknown) {
  const value = typeof role === 'string' ? role.trim().toLowerCase() : '';
  return value === 'admin' || value === 'manager' || value === 'staff';
}

export async function POST(request: Request, context: { params: Promise<{ orderId: string }> }) {
  try {
    const decoded = await requireAuth(request);
    const { orderId } = await context.params;
    const safeOrderId = decodeURIComponent(orderId || '').trim();
    if (!safeOrderId) {
      throw new ApiError(400, 'Order ID is required.');
    }

    const body = await request.json().catch(() => ({}));
    const rawMessage = typeof body?.message === 'string' ? body.message : '';
    const message = rawMessage.trim();
    if (!message) {
      throw new ApiError(400, 'Message is required.');
    }
    if (message.length > 2000) {
      throw new ApiError(400, 'Message is too long.');
    }

    const orderRef = adminDb.collection('orders').doc(safeOrderId);
    const orderSnap = await orderRef.get();
    if (!orderSnap.exists) {
      throw new ApiError(404, 'Order not found.');
    }

    const order = orderSnap.data() as Record<string, any>;
    const profileSnap = await adminDb.collection('users').doc(decoded.uid).get();
    const profile = profileSnap.data() as Record<string, any> | undefined;

    const isStaff =
      decoded.email === ADMIN_EMAIL ||
      isStaffRole(profile?.role) ||
      isStaffRole(decoded.role);

    if (!isStaff && decoded.uid !== order.userId) {
      throw new ApiError(403, 'You do not have access to this order.');
    }

    const existingMessages = Array.isArray(order.messages) ? [...order.messages] : [];
    const senderRole = isStaff ? 'admin' : 'user';
    const now = new Date();
    const messageEntry = {
      senderRole,
      senderId: decoded.uid,
      senderName: profile?.displayName || decoded.name || decoded.email || '',
      message,
      createdAt: now,
    };

    await orderRef.update({
      messages: [...existingMessages, messageEntry],
      latestMessagePreview: message.slice(0, 220),
      latestMessageAt: adminFieldValue.serverTimestamp(),
      updatedAt: adminFieldValue.serverTimestamp(),
      updated_at: adminFieldValue.serverTimestamp(),
    });

    if (!isStaff) {
      const usersSnapshot = await adminDb.collection('users').get();
      const recipients = usersSnapshot.docs
        .map((userDoc) => {
          const userData = userDoc.data() as Record<string, any>;
          return {
            id: userDoc.id,
            role: userData.role,
          };
        })
        .filter((entry) => isStaffRole(entry.role))
        .map((entry) => entry.id);

      if (recipients.length) {
        const batch = adminDb.batch();
        recipients.forEach((recipientId) => {
          const notificationRef = adminDb.collection('notifications').doc();
          batch.set(notificationRef, {
            recipientId,
            recipientRole: 'admin',
            type: 'order_message',
            title: 'New User Message',
            body: message.slice(0, 220),
            link: `/admin/orders?order=${encodeURIComponent(safeOrderId)}`,
            orderId: safeOrderId,
            metadata: {
              orderId: getOrderDisplayId({ id: safeOrderId, ...(order as any) } as any),
              status: normalizeOrderStatus(order.status || 'pending'),
              senderId: decoded.uid,
            },
            read: false,
            createdAt: adminFieldValue.serverTimestamp(),
            updatedAt: adminFieldValue.serverTimestamp(),
          });
        });
        await batch.commit();
      }
    }

    return NextResponse.json({
      success: true,
      message: {
        ...messageEntry,
        createdAt: now.toISOString(),
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
