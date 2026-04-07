import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/server/firebase-admin';
import { requireStaff } from '@/lib/server/auth';
import { ApiError, jsonError } from '@/lib/server/http';
import { getBroadcastUserIds, notifyUsers } from '@/lib/server/notifications';

interface SendNotificationBody {
  title: string;
  body: string;
  link?: string;
  imageUrl?: string;
  targetType: 'broadcast' | 'targeted';
  userIds?: string[];
  targetRole?: 'all' | 'user' | 'admin';
}

function sanitize(value: unknown, max = 500) {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim().slice(0, max);
}

export async function POST(request: Request) {
  try {
    const admin = await requireStaff(request);
    const body = (await request.json()) as SendNotificationBody;

    const title = sanitize(body.title, 120);
    const messageBody = sanitize(body.body, 500);
    const link = sanitize(body.link, 500) || '/';
    const imageUrl = sanitize(body.imageUrl, 1000) || undefined;

    if (!title || !messageBody) {
      throw new ApiError(400, 'Notification title and body are required');
    }

    const targetType = body.targetType;
    if (targetType !== 'broadcast' && targetType !== 'targeted') {
      throw new ApiError(400, 'Invalid targetType');
    }

    let recipientIds: string[] = [];

    if (targetType === 'broadcast') {
      const targetRole = body.targetRole || 'user';
      recipientIds = await getBroadcastUserIds(targetRole);
      if (targetRole === 'user') {
        const adminIds = await getBroadcastUserIds('admin');
        const adminSet = new Set(adminIds);
        recipientIds = recipientIds.filter((id) => !adminSet.has(id));
      }
    } else {
      recipientIds = Array.isArray(body.userIds) ? body.userIds.filter(Boolean) : [];
    }

    recipientIds = [...new Set(recipientIds)];

    if (!recipientIds.length) {
      throw new ApiError(400, 'No recipients selected');
    }

    const userDocs = await Promise.all(recipientIds.map((id) => adminDb.collection('users').doc(id).get()));
    const userIds: string[] = [];
    const adminIds: string[] = [];

    userDocs.forEach((doc) => {
      if (!doc.exists) {
        return;
      }
      const role = doc.data()?.role;
      if (role === 'admin' || role === 'manager') {
        adminIds.push(doc.id);
      } else {
        userIds.push(doc.id);
      }
    });

    let totalSent = 0;
    let totalFailed = 0;

    if (userIds.length) {
      const pushResult = await notifyUsers(userIds, 'user', {
        type: 'admin_broadcast',
        title,
        body: messageBody,
        link,
        imageUrl,
        metadata: {
          senderId: admin.uid,
          targetType,
        },
      });
      totalSent += pushResult.sent;
      totalFailed += pushResult.failed;
    }

    if (adminIds.length) {
      const pushResult = await notifyUsers(adminIds, 'admin', {
        type: 'admin_broadcast',
        title,
        body: messageBody,
        link,
        imageUrl,
        metadata: {
          senderId: admin.uid,
          targetType,
        },
      });
      totalSent += pushResult.sent;
      totalFailed += pushResult.failed;
    }

    await adminDb.collection('notification_dispatches').add({
      title,
      body: messageBody,
      link,
      imageUrl: imageUrl || null,
      targetType,
      targetRole: body.targetRole || null,
      userIds: recipientIds,
      recipientCount: recipientIds.length,
      sentCount: totalSent,
      failedCount: totalFailed,
      sentBy: admin.uid,
      createdAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      recipientCount: recipientIds.length,
      sentCount: totalSent,
      failedCount: totalFailed,
    });
  } catch (error) {
    return jsonError(error);
  }
}

