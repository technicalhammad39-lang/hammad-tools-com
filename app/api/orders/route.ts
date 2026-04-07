import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/server/firebase-admin';
import { requireAuth } from '@/lib/server/auth';
import { jsonError, ApiError } from '@/lib/server/http';
import {
  ensureNonEmptyOrder,
  generateOrderNumber,
  normalizeOrderItem,
  type OrderItemPayload,
  type PaymentProofPayload,
  validatePaymentProof,
} from '@/lib/server/order-domain';
import { getAdminUserIds, notifyUsers } from '@/lib/server/notifications';

interface CreateOrderRequestBody {
  items: OrderItemPayload[];
  paymentMethodId: string;
  paymentProof: PaymentProofPayload;
  note?: string;
}

function sanitizeNote(value: unknown) {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim().slice(0, 1500);
}

export async function POST(request: Request) {
  try {
    const decoded = await requireAuth(request);
    const body = (await request.json()) as CreateOrderRequestBody;

    ensureNonEmptyOrder(body.items);

    if (!body.paymentMethodId || typeof body.paymentMethodId !== 'string') {
      throw new ApiError(400, 'Payment method is required');
    }

    const paymentProof = validatePaymentProof(body.paymentProof);

    const paymentMethodSnap = await adminDb.collection('payment_methods').doc(body.paymentMethodId).get();
    if (!paymentMethodSnap.exists) {
      throw new ApiError(400, 'Selected payment method does not exist');
    }

    const paymentMethod = paymentMethodSnap.data() || {};
    if (paymentMethod.active === false) {
      throw new ApiError(400, 'Selected payment method is inactive');
    }

    const productSnapshots = await Promise.all(
      body.items.map(async (item) => {
        if (!item.productId || typeof item.productId !== 'string') {
          throw new ApiError(400, 'Each order item requires a valid productId');
        }

        const productDoc = await adminDb.collection('services').doc(item.productId).get();
        if (!productDoc.exists) {
          throw new ApiError(400, `Product not found: ${item.productId}`);
        }

        return { id: productDoc.id, data: productDoc.data() || {}, payload: item };
      })
    );

    const normalizedItems = productSnapshots.map((product) =>
      normalizeOrderItem(product.id, product.data, product.payload)
    );

    const subtotal = normalizedItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const totalAmount = Number(subtotal.toFixed(2));
    const orderNumber = generateOrderNumber();
    const now = new Date();

    const userProfileSnap = await adminDb.collection('users').doc(decoded.uid).get();
    const userProfile = userProfileSnap.data() || {};

    const orderRef = adminDb.collection('orders').doc();
    await orderRef.set({
      orderNumber,
      userId: decoded.uid,
      userEmail: decoded.email || userProfile.email || null,
      userName: userProfile.displayName || decoded.name || decoded.email || 'Customer',
      items: normalizedItems,
      paymentMethodId: paymentMethodSnap.id,
      paymentMethodSnapshot: {
        name: paymentMethod.name || paymentMethod.methodName || 'Payment Method',
        accountTitle: paymentMethod.accountTitle || null,
        accountNumber: paymentMethod.accountNumber || paymentMethod.walletNumber || paymentMethod.iban || null,
        instructions: paymentMethod.instructions || null,
      },
      paymentProof,
      userNote: sanitizeNote(body.note),
      subtotal: totalAmount,
      totalAmount,
      currency: 'PKR',
      status: 'pending_verification',
      statusHistory: [
        {
          status: 'pending_verification',
          message: 'Order submitted and pending verification.',
          actorRole: 'user',
          actorId: decoded.uid,
          createdAt: now,
        },
      ],
      adminMessage: '',
      internalNote: '',
      rejectionReason: '',
      deliveryDetails: '',
      entitlementIds: [],
      createdAt: now,
      updatedAt: now,
    });

    const adminIds = await getAdminUserIds();
    if (adminIds.length) {
      await notifyUsers(adminIds, 'admin', {
        type: 'new_order',
        title: 'New Order Submitted',
        body: `${orderNumber} was submitted and is pending verification.`,
        link: '/admin/orders',
        orderId: orderRef.id,
        metadata: {
          orderNumber,
          totalAmount,
          userId: decoded.uid,
        },
      });
    }

    return NextResponse.json({
      success: true,
      orderId: orderRef.id,
      orderNumber,
      status: 'pending_verification',
      message: 'Order submitted successfully. Verification may take up to 30 minutes.',
    });
  } catch (error) {
    return jsonError(error);
  }
}

