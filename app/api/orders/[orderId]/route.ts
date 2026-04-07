import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/server/firebase-admin';
import { requireStaff } from '@/lib/server/auth';
import { ApiError, jsonError } from '@/lib/server/http';
import { calculateExpiryDate, type DurationType } from '@/lib/server/order-domain';
import { notifyUsers } from '@/lib/server/notifications';

interface AdminOrderActionBody {
  action:
    | 'approve'
    | 'reject'
    | 'request_info'
    | 'send_message'
    | 'mark_completed'
    | 'add_internal_note';
  message?: string;
  rejectionReason?: string;
  deliveryDetails?: string;
  internalNote?: string;
  activateNow?: boolean;
}

type OrderStatus =
  | 'pending_verification'
  | 'approved'
  | 'rejected'
  | 'needs_info'
  | 'completed';

function cleanText(value: unknown, max = 2000) {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim().slice(0, max);
}

function cleanStatusHistory(orderData: Record<string, any>) {
  return Array.isArray(orderData.statusHistory) ? [...orderData.statusHistory] : [];
}

function cleanMessages(orderData: Record<string, any>) {
  return Array.isArray(orderData.messages) ? [...orderData.messages] : [];
}

function pushAdminMessage(messages: any[], content: string, now: Date, adminId: string) {
  if (!content) {
    return messages;
  }

  return [
    ...messages,
    {
      senderRole: 'admin',
      senderId: adminId,
      message: content,
      createdAt: now,
    },
  ];
}

function getDurationType(value: unknown): DurationType {
  if (
    value === 'fixed_days' ||
    value === 'fixed_months' ||
    value === 'fixed_years' ||
    value === 'custom_expiry' ||
    value === 'lifetime'
  ) {
    return value;
  }
  return 'fixed_months';
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ orderId: string }> }
) {
  try {
    const admin = await requireStaff(request);
    const { orderId } = await context.params;
    const body = (await request.json()) as AdminOrderActionBody;

    if (!body.action) {
      throw new ApiError(400, 'Action is required');
    }

    const now = new Date();
    const orderRef = adminDb.collection('orders').doc(orderId);

    let userId = '';
    let orderNumber = '';
    let finalStatus: OrderStatus | null = null;
    let entitlementIds: string[] = [];

    await adminDb.runTransaction(async (tx) => {
      const orderSnap = await tx.get(orderRef);
      if (!orderSnap.exists) {
        throw new ApiError(404, 'Order not found');
      }

      const orderData = orderSnap.data() as Record<string, any>;
      userId = String(orderData.userId || '');
      orderNumber = String(orderData.orderNumber || orderId);
      if (!userId) {
        throw new ApiError(400, 'Order has no user association');
      }

      let status = (orderData.status || 'pending_verification') as OrderStatus;
      let adminMessage = cleanText(orderData.adminMessage || '', 4000);
      let rejectionReason = cleanText(orderData.rejectionReason || '', 4000);
      let deliveryDetails = cleanText(orderData.deliveryDetails || '', 4000);
      let internalNote = cleanText(orderData.internalNote || '', 4000);

      const statusHistory = cleanStatusHistory(orderData);
      let messages = cleanMessages(orderData);
      const existingEntitlementIds = Array.isArray(orderData.entitlementIds)
        ? [...orderData.entitlementIds]
        : [];

      const payloadMessage = cleanText(body.message, 4000);
      const payloadRejectionReason = cleanText(body.rejectionReason, 4000);
      const payloadDeliveryDetails = cleanText(body.deliveryDetails, 4000);
      const payloadInternalNote = cleanText(body.internalNote, 4000);

      let statusEventMessage = '';

      if (body.action === 'approve') {
        status = 'approved';
        adminMessage = payloadMessage || adminMessage;
        deliveryDetails = payloadDeliveryDetails || deliveryDetails;
        statusEventMessage = adminMessage || 'Order approved by admin.';

        const shouldCreateEntitlements = (body.activateNow ?? true) && existingEntitlementIds.length === 0;

        if (shouldCreateEntitlements) {
          const items = Array.isArray(orderData.items) ? orderData.items : [];
          entitlementIds = [];

          items.forEach((item: Record<string, any>) => {
            const entitlementRef = adminDb.collection('entitlements').doc();
            const durationType = getDurationType(item.durationType);
            const durationValue = Number(item.durationValue) || null;
            const customExpiryAt = item.customExpiryAt?.toDate?.() || (item.customExpiryAt ? new Date(item.customExpiryAt) : null);
            const activatedAt = now;
            const expiresAt = calculateExpiryDate(activatedAt, durationType, durationValue, customExpiryAt);
            const entitlementStatus = expiresAt && expiresAt.getTime() <= now.getTime() ? 'expired' : 'active';

            tx.set(entitlementRef, {
              userId,
              orderId,
              orderNumber,
              productId: item.productId || null,
              productTitle: item.productTitle || 'Purchased Product',
              productType: item.productType || 'tools',
              planName: item.selectedPlanName || null,
              quantity: Number(item.quantity) || 1,
              status: entitlementStatus,
              durationType,
              durationValue,
              accessType: item.accessType || 'subscription',
              renewable: Boolean(item.renewable),
              activationBehavior: item.activationBehavior || 'activate_on_approval',
              activatedAt,
              expiresAt: expiresAt || null,
              deliveryDetails: payloadDeliveryDetails || deliveryDetails || '',
              orderItemSnapshot: item,
              createdAt: now,
              updatedAt: now,
            });

            entitlementIds.push(entitlementRef.id);
          });
        } else {
          entitlementIds = existingEntitlementIds;
        }
      }

      if (body.action === 'reject') {
        if (!payloadRejectionReason) {
          throw new ApiError(400, 'Rejection reason is required');
        }
        status = 'rejected';
        rejectionReason = payloadRejectionReason;
        adminMessage = payloadMessage || adminMessage;
        statusEventMessage = `Order rejected: ${payloadRejectionReason}`;
      }

      if (body.action === 'request_info') {
        if (!payloadMessage) {
          throw new ApiError(400, 'Message is required when requesting more info');
        }
        status = 'needs_info';
        adminMessage = payloadMessage;
        statusEventMessage = payloadMessage;
      }

      if (body.action === 'send_message') {
        if (!payloadMessage) {
          throw new ApiError(400, 'Message is required');
        }
        adminMessage = payloadMessage;
        statusEventMessage = payloadMessage;
      }

      if (body.action === 'mark_completed') {
        status = 'completed';
        adminMessage = payloadMessage || adminMessage;
        deliveryDetails = payloadDeliveryDetails || deliveryDetails;
        statusEventMessage = adminMessage || 'Order marked as completed.';
      }

      if (body.action === 'add_internal_note') {
        if (!payloadInternalNote) {
          throw new ApiError(400, 'Internal note is required');
        }
        internalNote = payloadInternalNote;
        statusEventMessage = 'Internal note updated.';
      }

      if (payloadMessage) {
        messages = pushAdminMessage(messages, payloadMessage, now, admin.uid);
      }

      if (body.action === 'reject' && payloadRejectionReason) {
        messages = pushAdminMessage(messages, `Rejection reason: ${payloadRejectionReason}`, now, admin.uid);
      }

      if ((body.action === 'approve' || body.action === 'mark_completed') && payloadDeliveryDetails) {
        messages = pushAdminMessage(messages, `Delivery details: ${payloadDeliveryDetails}`, now, admin.uid);
      }

      if (body.action !== 'add_internal_note') {
        statusHistory.push({
          status,
          message: statusEventMessage || `${body.action} action applied`,
          actorRole: 'admin',
          actorId: admin.uid,
          createdAt: now,
        });
      }

      const updatePayload: Record<string, unknown> = {
        status,
        adminMessage,
        rejectionReason,
        deliveryDetails,
        internalNote,
        messages,
        statusHistory,
        updatedAt: now,
      };

      if (body.action === 'approve') {
        updatePayload.approvedAt = now;
      }

      if (body.action === 'reject') {
        updatePayload.rejectedAt = now;
      }

      if (body.action === 'mark_completed') {
        updatePayload.completedAt = now;
      }

      if (body.action === 'approve') {
        updatePayload.entitlementIds = entitlementIds;
      }

      tx.update(orderRef, updatePayload);
      finalStatus = status;
    });

    if (!finalStatus) {
      throw new ApiError(500, 'Failed to update order');
    }

    if (userId) {
      if (finalStatus === 'approved') {
        await notifyUsers([userId], 'user', {
          type: 'order_approved',
          title: 'Order Approved',
          body: `Your order ${orderNumber} has been approved.`,
          link: '/dashboard',
          orderId,
          metadata: { entitlementIds },
        });

        if (entitlementIds.length) {
          await notifyUsers([userId], 'user', {
            type: 'subscription_activated',
            title: 'Subscription Activated',
            body: `Access for order ${orderNumber} is now active in your dashboard.`,
            link: '/dashboard',
            orderId,
          });
        }
      }

      if (finalStatus === 'rejected') {
        await notifyUsers([userId], 'user', {
          type: 'order_rejected',
          title: 'Order Rejected',
          body: `Your order ${orderNumber} was rejected. Please review admin notes.`,
          link: '/dashboard',
          orderId,
        });
      }

      if (finalStatus === 'needs_info') {
        await notifyUsers([userId], 'user', {
          type: 'order_needs_info',
          title: 'More Info Needed',
          body: `Admin requested additional payment details for ${orderNumber}.`,
          link: '/dashboard',
          orderId,
        });
      }

      if (finalStatus === 'completed') {
        await notifyUsers([userId], 'user', {
          type: 'order_completed',
          title: 'Order Completed',
          body: `Your order ${orderNumber} is marked as completed.`,
          link: '/dashboard',
          orderId,
        });
      }

      if (body.action === 'send_message') {
        await notifyUsers([userId], 'user', {
          type: 'admin_message',
          title: 'Message From Admin',
          body: cleanText(body.message, 140) || 'You have a new update regarding your order.',
          link: '/dashboard',
          orderId,
        });
      }
    }

    return NextResponse.json({
      success: true,
      orderId,
      status: finalStatus,
      entitlementIds,
    });
  } catch (error) {
    return jsonError(error);
  }
}

