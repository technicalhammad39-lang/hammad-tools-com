import type { OrderRecord, OrderStatus } from '@/lib/types/domain';

function randomToken(length: number) {
  const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = new Uint32Array(length);

  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < length; i += 1) {
      bytes[i] = Math.floor(Math.random() * charset.length);
    }
  }

  let output = '';
  for (let i = 0; i < length; i += 1) {
    output += charset[bytes[i] % charset.length];
  }
  return output;
}

export function createOrderPublicId(date = new Date()) {
  const year = String(date.getFullYear()).slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `HT-${year}${month}${day}${hour}${minute}-${randomToken(4)}`;
}

export function getOrderDisplayId(order: Partial<OrderRecord> & { id?: string }) {
  return order.orderId || order.order_id || order.orderNumber || order.id || 'N/A';
}

export function normalizeOrderStatus(status: string | undefined): OrderStatus {
  if (status === 'approved' || status === 'rejected' || status === 'pending') {
    return status;
  }

  if (status === 'pending_verification' || status === 'needs_info') {
    return 'pending';
  }

  if (status === 'completed') {
    return 'approved';
  }

  return 'pending';
}

export function formatOrderStatusLabel(status: string | undefined) {
  const normalized = normalizeOrderStatus(status);

  if (normalized === 'approved') {
    return 'Approved';
  }

  if (normalized === 'rejected') {
    return 'Rejected';
  }

  return 'Pending';
}

export function toDate(value: any) {
  return value?.toDate?.() || (value ? new Date(value) : null);
}

export function formatDateTime(value: any) {
  const date = toDate(value);
  if (!date || Number.isNaN(date.getTime())) {
    return 'N/A';
  }
  return date.toLocaleString();
}
