export type CouponScope = 'global' | 'category' | 'product';

type CouponRouteKind = 'home' | 'dashboard' | 'tools' | 'category' | 'product' | 'other';

export interface CouponRecord {
  id: string;
  code: string;
  discountPercentage: number;
  active: boolean;
  expiryDate?: any;
  scope: CouponScope;
  categoryId?: string;
  categorySlug?: string;
  categoryName?: string;
  productId?: string;
  productSlug?: string;
  productName?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface CouponCheckoutItem {
  productId?: string | null;
  itemId?: string | null;
  toolId?: string | null;
  productSlug?: string | null;
  slug?: string | null;
  categoryId?: string | null;
  categorySlug?: string | null;
  categoryName?: string | null;
  totalPrice: number;
}

export interface CouponRouteContext {
  pathname: string;
  productId?: string | null;
  itemId?: string | null;
  toolId?: string | null;
  productSlug?: string | null;
  slug?: string | null;
  categoryId?: string | null;
  categorySlug?: string | null;
  categoryName?: string | null;
}

type CouponRule = Pick<
  CouponRecord,
  | 'scope'
  | 'categoryId'
  | 'categorySlug'
  | 'categoryName'
  | 'productId'
  | 'productSlug'
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

function normalizePath(pathname: string) {
  const value = (pathname || '/').trim();
  if (!value) {
    return '/';
  }
  const clean = value.startsWith('/') ? value : `/${value}`;
  if (clean === '/') {
    return '/';
  }
  return clean.replace(/\/+$/, '');
}

function readFirstText(raw: Record<string, any>, keys: string[]) {
  for (const key of keys) {
    const value = normalizeText(raw[key]);
    if (value) {
      return value;
    }
  }
  return '';
}

function toIdCandidates(input: {
  productId?: unknown;
  itemId?: unknown;
  toolId?: unknown;
}) {
  return [input.productId, input.itemId, input.toolId]
    .map((value) => normalizeText(value))
    .filter(Boolean);
}

function toSlugCandidates(input: {
  productSlug?: unknown;
  slug?: unknown;
}) {
  return [input.productSlug, input.slug]
    .map((value) => normalizeSlug(value))
    .filter(Boolean);
}

function classifyRoute(context: CouponRouteContext): CouponRouteKind {
  const path = normalizePath(context.pathname || '/');
  if (path === '/') {
    return 'home';
  }
  if (path === '/dashboard' || path.startsWith('/dashboard/')) {
    return 'dashboard';
  }

  if (path === '/tools') {
    if (normalizeText(context.categoryId) || normalizeText(context.categorySlug) || normalizeText(context.categoryName)) {
      return 'category';
    }
    return 'tools';
  }

  if (path.startsWith('/tools/category/')) {
    return 'category';
  }

  if (path.startsWith('/tools/')) {
    return 'product';
  }

  return 'other';
}

export function normalizeCouponScope(value: unknown): CouponScope {
  const normalized = normalizeText(value).toLowerCase();
  if (['category', 'category_specific', 'category-specific'].includes(normalized)) {
    return 'category';
  }
  if (
    [
      'product',
      'specific_item',
      'specific-item',
      'specific_tool',
      'specific-tool',
      'tool',
      'item',
      'specificitem',
      'specifictool',
    ].includes(normalized)
  ) {
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
  const scope = normalizeCouponScope(
    raw.scope ?? raw.type ?? raw.couponType ?? raw.targetType ?? raw.appliesTo
  );

  const categoryNameFallback = scope === 'category' ? normalizeText(raw.targetName) : '';
  const productNameFallback = scope === 'product' ? normalizeText(raw.targetName) : '';

  return {
    id: normalizeText(id || raw.id || raw.code),
    code: normalizeCouponCode(raw.code || id),
    discountPercentage: Math.max(0, Number(raw.discountPercentage || 0)),
    active: raw.active !== false,
    expiryDate: raw.expiryDate ?? raw.expiryTime ?? raw.expiry_timestamp ?? null,
    scope,
    categoryId: readFirstText(raw, ['categoryId', 'targetCategoryId']),
    categorySlug: normalizeSlug(
      readFirstText(raw, ['categorySlug', 'targetCategorySlug', 'category_slug'])
    ),
    categoryName: readFirstText(raw, ['categoryName']) || categoryNameFallback,
    productId: readFirstText(raw, ['productId', 'toolId', 'itemId', 'targetProductId']),
    productSlug: normalizeSlug(
      readFirstText(raw, ['productSlug', 'slug', 'targetSlug', 'toolSlug', 'itemSlug'])
    ),
    productName: readFirstText(raw, ['productName', 'toolName', 'itemName']) || productNameFallback,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

function isCategoryMatch(
  coupon: CouponRule,
  item: { categoryId?: string | null; categorySlug?: string | null; categoryName?: string | null }
) {
  const couponCategoryId = normalizeText(coupon.categoryId);
  const couponCategorySlug = normalizeSlug(coupon.categorySlug);
  const couponCategoryName = normalizeName(coupon.categoryName);
  const itemCategoryId = normalizeText(item.categoryId);
  const itemCategorySlug = normalizeSlug(item.categorySlug);
  const itemCategoryName = normalizeName(item.categoryName);

  if (couponCategoryId && itemCategoryId) {
    return couponCategoryId === itemCategoryId;
  }

  if (couponCategorySlug && itemCategorySlug) {
    return couponCategorySlug === itemCategorySlug;
  }

  if (couponCategoryName && itemCategoryName) {
    return couponCategoryName === itemCategoryName;
  }

  return false;
}

function isProductMatch(
  coupon: CouponRule,
  item: { productId?: string | null; itemId?: string | null; toolId?: string | null; productSlug?: string | null; slug?: string | null }
) {
  const couponProductIds = toIdCandidates({
    productId: coupon.productId,
    itemId: undefined,
    toolId: undefined,
  });
  const itemProductIds = toIdCandidates(item);
  if (couponProductIds.length && itemProductIds.length) {
    return couponProductIds.some((couponId) => itemProductIds.includes(couponId));
  }

  const couponSlugs = toSlugCandidates({ productSlug: coupon.productSlug, slug: undefined });
  const itemSlugs = toSlugCandidates(item);
  if (couponSlugs.length && itemSlugs.length) {
    return couponSlugs.some((couponSlug) => itemSlugs.includes(couponSlug));
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
  const routeKind = classifyRoute(context);
  if (routeKind === 'other') {
    return false;
  }

  if (routeKind === 'home' || routeKind === 'dashboard' || routeKind === 'tools') {
    return true;
  }

  if (routeKind === 'category') {
    if (coupon.scope === 'global') {
      return true;
    }
    if (coupon.scope === 'category') {
      return isCategoryMatch(coupon, context);
    }
    return false;
  }

  if (routeKind === 'product') {
    if (coupon.scope === 'global') {
      return true;
    }
    if (coupon.scope === 'category') {
      return isCategoryMatch(coupon, context);
    }
    if (coupon.scope === 'product') {
      return isProductMatch(coupon, context);
    }
  }

  return false;
}

export function getCouponScopePriority(scope: CouponScope) {
  if (scope === 'product') {
    return 3;
  }
  if (scope === 'category') {
    return 2;
  }
  return 1;
}

export function pickBestCouponForRoute(
  coupons: CouponRecord[],
  context: CouponRouteContext,
  nowMs = Date.now()
) {
  const candidates = coupons.filter(
    (coupon) =>
      coupon.active !== false &&
      !isCouponExpired(coupon, nowMs) &&
      isCouponVisibleForRoute(coupon, context)
  );

  if (!candidates.length) {
    return null;
  }

  candidates.sort((a, b) => {
    const priorityDelta = getCouponScopePriority(b.scope) - getCouponScopePriority(a.scope);
    if (priorityDelta !== 0) {
      return priorityDelta;
    }

    const aExpiry = toMillis(a.expiryDate) || Number.POSITIVE_INFINITY;
    const bExpiry = toMillis(b.expiryDate) || Number.POSITIVE_INFINITY;
    if (aExpiry !== bExpiry) {
      return aExpiry - bExpiry;
    }

    const discountDelta = Number(b.discountPercentage || 0) - Number(a.discountPercentage || 0);
    if (discountDelta !== 0) {
      return discountDelta;
    }

    return toMillis(b.updatedAt) - toMillis(a.updatedAt);
  });

  return candidates[0];
}

export function getCouponDisplayTitle(coupon: CouponRecord) {
  if (coupon.scope === 'product') {
    return normalizeText(coupon.productName) || normalizeText(coupon.productSlug) || 'Featured Item';
  }
  if (coupon.scope === 'category') {
    return (
      normalizeText(coupon.categoryName) ||
      normalizeText(coupon.categorySlug) ||
      'Category Deal'
    );
  }
  return 'All Premium Tools';
}
