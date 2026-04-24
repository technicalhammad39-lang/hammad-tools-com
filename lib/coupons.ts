export type CouponScope = 'global' | 'category' | 'product';

export interface CouponRecord {
  id: string;
  code: string;
  discountPercentage: number;
  active: boolean;
  expiryDate?: any;
  scope: CouponScope;
  categoryId?: string;
  categoryName?: string;
  productId?: string;
  productSlug?: string;
  productName?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface CouponCheckoutItem {
  productId: string;
  productSlug?: string | null;
  categoryId?: string | null;
  categoryName?: string | null;
  totalPrice: number;
}

export interface CouponRouteContext {
  pathname: string;
  productId?: string | null;
  productSlug?: string | null;
  categoryId?: string | null;
  categoryName?: string | null;
}

type CouponRule = Pick<
  CouponRecord,
  'scope' | 'categoryId' | 'categoryName' | 'productId' | 'productSlug'
>;

function normalizeText(value: unknown) {
  return String(value || '').trim();
}

function normalizeSlug(value: unknown) {
  return normalizeText(value).toLowerCase().replace(/\s+/g, '-');
}

function normalizeName(value: unknown) {
  return normalizeText(value).toLowerCase();
}

export function normalizeCouponScope(value: unknown): CouponScope {
  const normalized = normalizeText(value).toLowerCase();
  if (normalized === 'category') {
    return 'category';
  }
  if (normalized === 'product') {
    return 'product';
  }
  return 'global';
}

export function normalizeCouponCode(value: unknown) {
  return normalizeText(value).toUpperCase();
}

export function toMillis(value: any) {
  if (!value) {
    return 0;
  }

  if (typeof value?.toMillis === 'function') {
    return Number(value.toMillis() || 0);
  }

  if (typeof value?.toDate === 'function') {
    const date = value.toDate();
    return date instanceof Date ? date.getTime() : 0;
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === 'string') {
    const normalized = value.trim();
    const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;
    const parsed = dateOnlyPattern.test(normalized)
      ? new Date(`${normalized}T23:59:59.999`)
      : new Date(normalized);
    return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
  }

  return 0;
}

export function isCouponExpired(coupon: Pick<CouponRecord, 'expiryDate'>, nowMs = Date.now()) {
  const expiresAt = toMillis(coupon.expiryDate);
  if (!expiresAt) {
    return false;
  }
  return expiresAt <= nowMs;
}

export function normalizeCoupon(raw: Record<string, any>, id = ''): CouponRecord {
  const scope = normalizeCouponScope(raw.scope ?? raw.type ?? raw.couponType);

  return {
    id: normalizeText(id || raw.id || raw.code),
    code: normalizeCouponCode(raw.code),
    discountPercentage: Math.max(0, Number(raw.discountPercentage || 0)),
    active: raw.active !== false,
    expiryDate: raw.expiryDate || null,
    scope,
    categoryId: normalizeText(raw.categoryId),
    categoryName: normalizeText(raw.categoryName),
    productId: normalizeText(raw.productId),
    productSlug: normalizeSlug(raw.productSlug),
    productName: normalizeText(raw.productName),
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

function isCategoryMatch(coupon: CouponRule, item: { categoryId?: string | null; categoryName?: string | null }) {
  const couponCategoryId = normalizeText(coupon.categoryId);
  const couponCategoryName = normalizeName(coupon.categoryName);
  const itemCategoryId = normalizeText(item.categoryId);
  const itemCategoryName = normalizeName(item.categoryName);

  if (couponCategoryId && itemCategoryId) {
    return couponCategoryId === itemCategoryId;
  }

  if (couponCategoryName && itemCategoryName) {
    return couponCategoryName === itemCategoryName;
  }

  return false;
}

function isProductMatch(
  coupon: CouponRule,
  item: { productId?: string | null; productSlug?: string | null }
) {
  const couponProductId = normalizeText(coupon.productId);
  const couponProductSlug = normalizeSlug(coupon.productSlug);
  const itemProductId = normalizeText(item.productId);
  const itemProductSlug = normalizeSlug(item.productSlug);

  if (couponProductId && itemProductId) {
    return couponProductId === itemProductId;
  }

  if (couponProductSlug && itemProductSlug) {
    return couponProductSlug === itemProductSlug;
  }

  return false;
}

export function isCouponApplicableToItem(coupon: CouponRule, item: CouponCheckoutItem) {
  if (coupon.scope === 'global') {
    return true;
  }

  if (coupon.scope === 'category') {
    return isCategoryMatch(coupon, item);
  }

  if (coupon.scope === 'product') {
    return isProductMatch(coupon, item);
  }

  return false;
}

export function getCouponEligibleSubtotal(coupon: CouponRule, items: CouponCheckoutItem[]) {
  return items.reduce((sum, item) => {
    if (!isCouponApplicableToItem(coupon, item)) {
      return sum;
    }
    return sum + Number(item.totalPrice || 0);
  }, 0);
}

export function isCouponVisibleForRoute(coupon: CouponRule, context: CouponRouteContext) {
  const path = context.pathname || '/';
  if (coupon.scope === 'global') {
    return true;
  }

  if (path === '/' || path === '/tools') {
    return true;
  }

  if (path.startsWith('/tools/')) {
    if (coupon.scope === 'category') {
      return isCategoryMatch(coupon, context);
    }
    if (coupon.scope === 'product') {
      return isProductMatch(coupon, context);
    }
  }

  return false;
}

export function getCouponDisplayTitle(coupon: CouponRecord) {
  if (coupon.scope === 'product') {
    return normalizeText(coupon.productName) || 'Featured Tool';
  }
  if (coupon.scope === 'category') {
    return normalizeText(coupon.categoryName) || 'Category Deal';
  }
  return 'All Premium Tools';
}
