import type { DocumentData } from 'firebase-admin/firestore';
import { ApiError } from './http';

export type DurationType = 'fixed_days' | 'fixed_months' | 'fixed_years' | 'custom_expiry' | 'lifetime';
export type ActivationBehavior = 'activate_on_approval' | 'manual_activation';
export type AccessType = 'subscription' | 'one_time_service' | 'renewable_membership' | 'tool_access';

export interface OrderItemPayload {
  productId: string;
  quantity?: number;
  selectedPlanId?: string;
  selectedPlanName?: string;
}

export interface PaymentProofPayload {
  senderName: string;
  senderNumber: string;
  transactionId: string;
  screenshotUrl?: string;
  note?: string;
}

export interface NormalizedOrderItem {
  productId: string;
  productTitle: string;
  productType: 'tools' | 'services';
  categoryId: string | null;
  categoryName: string | null;
  quantity: number;
  selectedPlanId: string | null;
  selectedPlanName: string | null;
  unitPrice: number;
  totalPrice: number;
  accessType: AccessType;
  activationBehavior: ActivationBehavior;
  renewable: boolean;
  durationType: DurationType;
  durationValue: number | null;
  customExpiryAt: Date | null;
  productSnapshot: Record<string, unknown>;
}

export function generateOrderNumber() {
  const stamp = Date.now().toString().slice(-8);
  const nonce = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `HT-${stamp}-${nonce}`;
}

function normalizeString(value: unknown, fallback = ''): string {
  if (typeof value !== 'string') {
    return fallback;
  }
  return value.trim();
}

function toNumber(value: unknown, fallback = 0): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function asBoolean(value: unknown, fallback = false) {
  if (typeof value === 'boolean') {
    return value;
  }
  return fallback;
}

function asType(value: unknown, allowed: string[], fallback: string) {
  if (typeof value === 'string' && allowed.includes(value)) {
    return value;
  }
  return fallback;
}

function parseDate(value: unknown): Date | null {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value;
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (typeof value === 'object' && value && 'toDate' in value && typeof (value as { toDate: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate();
  }

  return null;
}

function pickFirstString(obj: DocumentData, keys: string[], fallback = '') {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return fallback;
}

function resolvePlan(product: DocumentData, item: OrderItemPayload) {
  const plans = Array.isArray(product.plans) ? product.plans : [];

  if (!plans.length) {
    return null;
  }

  const normalizedPlanId = normalizeString(item.selectedPlanId).toLowerCase();
  const normalizedPlanName = normalizeString(item.selectedPlanName).toLowerCase();

  return (
    plans.find((plan: DocumentData) => {
      const planId = normalizeString(plan.id || plan.planId).toLowerCase();
      const planName = normalizeString(plan.planName || plan.name).toLowerCase();

      if (normalizedPlanId && planId === normalizedPlanId) {
        return true;
      }

      if (normalizedPlanName && planName === normalizedPlanName) {
        return true;
      }

      return false;
    }) || plans[0]
  );
}

function resolveDuration(product: DocumentData, plan: DocumentData | null) {
  const source = plan || product;

  const durationType = asType(
    source.durationType,
    ['fixed_days', 'fixed_months', 'fixed_years', 'custom_expiry', 'lifetime'],
    'fixed_months'
  ) as DurationType;

  const durationValue = toNumber(source.durationValue, 1);
  const customExpiryAt = parseDate(source.customExpiryAt);

  return {
    durationType,
    durationValue: durationType === 'lifetime' ? null : durationValue,
    customExpiryAt,
  };
}

export function calculateExpiryDate(
  activatedAt: Date,
  durationType: DurationType,
  durationValue: number | null,
  customExpiryAt: Date | null
): Date | null {
  if (durationType === 'lifetime') {
    return null;
  }

  if (durationType === 'custom_expiry') {
    return customExpiryAt;
  }

  const value = durationValue && durationValue > 0 ? durationValue : 1;
  const expiry = new Date(activatedAt);

  if (durationType === 'fixed_days') {
    expiry.setDate(expiry.getDate() + value);
    return expiry;
  }

  if (durationType === 'fixed_months') {
    expiry.setMonth(expiry.getMonth() + value);
    return expiry;
  }

  expiry.setFullYear(expiry.getFullYear() + value);
  return expiry;
}

export function normalizeOrderItem(productId: string, product: DocumentData, payload: OrderItemPayload): NormalizedOrderItem {
  if (asBoolean(product.active, true) === false) {
    throw new ApiError(400, `Product ${productId} is currently inactive`);
  }

  const quantity = Math.max(1, Math.min(100, Math.floor(toNumber(payload.quantity, 1))));
  const selectedPlan = resolvePlan(product, payload);

  const productTitle = pickFirstString(product, ['title', 'name'], 'Untitled Product');
  const unitPrice = toNumber(selectedPlan?.salePrice ?? selectedPlan?.ourPrice ?? selectedPlan?.price ?? product.salePrice ?? product.price, 0);

  if (unitPrice <= 0) {
    throw new ApiError(400, `Product ${productTitle} has invalid pricing`);
  }

  const productType = asType(product.type, ['tools', 'services'], 'tools') as 'tools' | 'services';
  const accessType = asType(
    selectedPlan?.accessType ?? product.accessType,
    ['subscription', 'one_time_service', 'renewable_membership', 'tool_access'],
    productType === 'services' ? 'one_time_service' : 'subscription'
  ) as AccessType;
  const activationBehavior = asType(
    selectedPlan?.activationBehavior ?? product.activationBehavior,
    ['activate_on_approval', 'manual_activation'],
    'activate_on_approval'
  ) as ActivationBehavior;

  const { durationType, durationValue, customExpiryAt } = resolveDuration(product, selectedPlan);

  const selectedPlanName = normalizeString(selectedPlan?.planName || selectedPlan?.name || payload.selectedPlanName) || null;

  return {
    productId,
    productTitle,
    productType,
    categoryId: normalizeString(product.categoryId) || null,
    categoryName: normalizeString(product.categoryName || product.category) || null,
    quantity,
    selectedPlanId: normalizeString(selectedPlan?.id || selectedPlan?.planId || payload.selectedPlanId) || null,
    selectedPlanName,
    unitPrice,
    totalPrice: unitPrice * quantity,
    accessType,
    activationBehavior,
    renewable: asBoolean(selectedPlan?.renewable ?? product.renewable, false),
    durationType,
    durationValue,
    customExpiryAt,
    productSnapshot: {
      title: productTitle,
      description: pickFirstString(product, ['description'], ''),
      image: pickFirstString(product, ['image', 'thumbnail'], ''),
      type: productType,
      categoryId: normalizeString(product.categoryId) || null,
      categoryName: normalizeString(product.categoryName || product.category) || null,
      checkoutInstructions: normalizeString(product.checkoutInstructions),
    },
  };
}

export function validatePaymentProof(proof: PaymentProofPayload) {
  const senderName = normalizeString(proof.senderName);
  const senderNumber = normalizeString(proof.senderNumber);
  const transactionId = normalizeString(proof.transactionId);
  const screenshotUrl = normalizeString(proof.screenshotUrl);

  if (!senderName || senderName.length < 2) {
    throw new ApiError(400, 'Sender name is required');
  }

  if (!senderNumber || senderNumber.length < 7) {
    throw new ApiError(400, 'Sender number is required');
  }

  if (!transactionId || transactionId.length < 4) {
    throw new ApiError(400, 'Transaction ID is required');
  }

  if (screenshotUrl && !/^https?:\/\//.test(screenshotUrl)) {
    throw new ApiError(400, 'Valid screenshot URL is required');
  }

  return {
    senderName,
    senderNumber,
    transactionId,
    screenshotUrl: screenshotUrl || '',
    note: normalizeString(proof.note),
  };
}

export function ensureNonEmptyOrder(items: OrderItemPayload[]) {
  if (!Array.isArray(items) || !items.length) {
    throw new ApiError(400, 'At least one order item is required');
  }
}

