import { adminDb } from './firebase-admin';

export interface NotificationPayload {
  type: string;
  title: string;
  body: string;
  link?: string;
  imageUrl?: string;
  orderId?: string;
  entitlementId?: string;
  metadata?: Record<string, unknown>;
}

function chunkArray<T>(input: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < input.length; i += size) {
    chunks.push(input.slice(i, i + size));
  }
  return chunks;
}

export async function getAdminUserIds() {
  const snapshot = await adminDb.collection('users').where('role', '==', 'admin').get();
  return snapshot.docs.map((doc) => doc.id);
}

export async function createInAppNotifications(
  userIds: string[],
  recipientRole: 'admin' | 'user',
  payload: NotificationPayload
) {
  if (!userIds.length) {
    return;
  }

  const now = new Date();
  const chunks = chunkArray(userIds, 400);

  for (const chunk of chunks) {
    const batch = adminDb.batch();
    chunk.forEach((userId) => {
      const ref = adminDb.collection('notifications').doc();
      batch.set(ref, {
        recipientId: userId,
        recipientRole,
        type: payload.type,
        title: payload.title,
        body: payload.body,
        link: payload.link || null,
        imageUrl: payload.imageUrl || null,
        orderId: payload.orderId || null,
        entitlementId: payload.entitlementId || null,
        metadata: payload.metadata || {},
        read: false,
        createdAt: now,
        updatedAt: now,
      });
    });
    await batch.commit();
  }
}

export async function notifyUsers(
  userIds: string[],
  role: 'admin' | 'user',
  payload: NotificationPayload
) {
  await createInAppNotifications(userIds, role, payload);
  return { sent: 0, failed: 0 };
}

export async function getBroadcastUserIds(targetRole: 'all' | 'admin' | 'user' = 'all') {
  if (targetRole === 'all') {
    const snapshot = await adminDb.collection('users').get();
    return snapshot.docs.map((doc) => doc.id);
  }

  if (targetRole === 'admin') {
    const snapshot = await adminDb.collection('users').where('role', 'in', ['admin', 'manager']).get();
    return snapshot.docs.map((doc) => doc.id);
  }

  const snapshot = await adminDb.collection('users').where('role', '==', targetRole).get();
  return snapshot.docs.map((doc) => doc.id);
}
