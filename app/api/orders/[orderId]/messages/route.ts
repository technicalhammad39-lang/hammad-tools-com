import { NextResponse } from 'next/server';
import { adminDb, adminFieldValue } from '@/lib/server/firebase-admin';
import { requireAuth } from '@/lib/server/auth';
import { ApiError, jsonError } from '@/lib/server/http';
import { getOrderDisplayId, normalizeOrderStatus } from '@/lib/order-system';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ADMIN_EMAIL = 'technicalhammad39@gmail.com';
const MAX_MESSAGE_LENGTH = 2000;

type AttachmentInput = {
  url?: string;
  name?: string;
  type?: string;
  size?: number;
  media?: {
    mediaId?: string;
    fileUrl?: string;
    storagePath?: string;
    fileName?: string;
    mimeType?: string;
    sizeBytes?: number;
    folder?: string;
    access?: string;
  } | null;
};

type ValidatedAttachment = {
  url: string;
  name: string;
  type: string;
  size: number;
  media: {
    mediaId: string;
    fileUrl: string;
    storagePath: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    folder: string;
    access: string;
    uploadedBy: string;
  };
};

function isStaffRole(role: unknown) {
  const value = typeof role === 'string' ? role.trim().toLowerCase() : '';
  return value === 'admin' || value === 'manager' || value === 'staff';
}

function sanitizeText(value: unknown, maxLength: number) {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim().slice(0, maxLength);
}

function sanitizeNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }
  return parsed;
}

async function validateAttachment(
  input: unknown,
  params: {
    uid: string;
    isStaff: boolean;
    safeOrderId: string;
  }
): Promise<ValidatedAttachment | null> {
  if (!input || typeof input !== 'object') {
    return null;
  }

  const attachment = input as AttachmentInput;
  const mediaId = sanitizeText(attachment.media?.mediaId, 200);
  if (!mediaId) {
    throw new ApiError(400, 'Attachment mediaId is required.');
  }

  const mediaSnap = await adminDb.collection('media_files').doc(mediaId).get();
  if (!mediaSnap.exists) {
    throw new ApiError(400, 'Attachment media not found.');
  }

  const mediaData = mediaSnap.data() as Record<string, any>;
  const relatedOrderId = sanitizeText(mediaData.relatedOrderId, 200);
  if (!relatedOrderId || relatedOrderId !== params.safeOrderId) {
    throw new ApiError(403, 'Attachment does not belong to this order.');
  }

  if (!params.isStaff && sanitizeText(mediaData.ownerId, 200) !== params.uid) {
    throw new ApiError(403, 'You do not have permission to use this attachment.');
  }

  return {
    url: sanitizeText(mediaData.fileUrl || attachment.url, 2000),
    name:
      sanitizeText(attachment.name, 220) ||
      sanitizeText(mediaData.originalFileName, 220) ||
      sanitizeText(mediaData.fileName, 220) ||
      'Attachment',
    type: sanitizeText(mediaData.mimeType || attachment.type, 160) || 'application/octet-stream',
    size: sanitizeNumber(mediaData.sizeBytes || attachment.size, 0),
    media: {
      mediaId,
      fileUrl: sanitizeText(mediaData.fileUrl, 2000),
      storagePath: sanitizeText(mediaData.storagePath, 500),
      fileName: sanitizeText(mediaData.fileName, 240),
      mimeType: sanitizeText(mediaData.mimeType, 160),
      sizeBytes: sanitizeNumber(mediaData.sizeBytes, 0),
      folder: sanitizeText(mediaData.folder, 80),
      access: sanitizeText(mediaData.access, 40),
      uploadedBy: params.uid,
    },
  };
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
    if (message.length > MAX_MESSAGE_LENGTH) {
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

    const orderOwnerId = sanitizeText(order.userId || order.user_id, 200);
    if (!isStaff && decoded.uid !== orderOwnerId) {
      throw new ApiError(403, 'You do not have access to this order.');
    }

    const validatedAttachment = await validateAttachment(body?.attachment, {
      uid: decoded.uid,
      isStaff,
      safeOrderId,
    });
    if (!message && !validatedAttachment) {
      throw new ApiError(400, 'Message or attachment is required.');
    }

    const existingMessages = Array.isArray(order.messages) ? [...order.messages] : [];
    const senderRole = isStaff ? 'admin' : 'user';
    const now = new Date();
    const preview = message || `Attachment: ${validatedAttachment?.name || 'file'}`;
    const messageEntry = {
      senderRole,
      senderId: decoded.uid,
      senderName: profile?.displayName || decoded.name || decoded.email || '',
      message,
      attachmentUrl: validatedAttachment?.url || '',
      attachmentName: validatedAttachment?.name || '',
      attachmentType: validatedAttachment?.type || '',
      attachmentSize: validatedAttachment?.size || 0,
      attachmentMedia: validatedAttachment?.media || null,
      createdAt: now,
    };

    await orderRef.update({
      messages: [...existingMessages, messageEntry],
      latestMessagePreview: preview.slice(0, 220),
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
            body: preview.slice(0, 220),
            link: `/admin/orders?order=${encodeURIComponent(safeOrderId)}`,
            orderId: safeOrderId,
            metadata: {
              orderId: getOrderDisplayId({ id: safeOrderId, ...(order as any) } as any),
              status: normalizeOrderStatus(order.status || 'pending'),
              senderId: decoded.uid,
              attachmentMediaId: validatedAttachment?.media?.mediaId || '',
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
