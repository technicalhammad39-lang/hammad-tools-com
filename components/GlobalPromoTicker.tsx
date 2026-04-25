'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { collection, getDocs, limit, onSnapshot, query, where } from 'firebase/firestore';
import { Copy, X } from 'lucide-react';
import { db } from '@/firebase';
import { useToast } from '@/components/ToastProvider';
import {
  getCouponDisplayTitle,
  normalizeCoupon,
  normalizeCouponCode,
  pickBestCouponForRoute,
  toMillis,
  type CouponRecord,
  type CouponRouteContext,
} from '@/lib/coupons';

const SESSION_HIDE_KEY = 'global_promo_ticker_hidden_v2';
const FIRE = '\uD83D\uDD25';

export interface PromoCouponData {
  [key: string]: unknown;
  code?: string;
}

function normalizeText(value: unknown) {
  return String(value || '').trim();
}

function normalizeSlug(value: unknown) {
  return normalizeText(value).toLowerCase().replace(/\s+/g, '-');
}

function normalizePath(pathname: string) {
  const value = pathname || '/';
  if (value === '/') {
    return '/';
  }
  return value.replace(/\/+$/, '');
}

function getToolSlugFromPath(pathname: string) {
  const normalizedPath = normalizePath(pathname);
  const prefix = '/tools/';
  if (!normalizedPath.startsWith(prefix) || normalizedPath.startsWith('/tools/category/')) {
    return '';
  }
  const segment = decodeURIComponent(normalizedPath.slice(prefix.length));
  return normalizeSlug(segment);
}

function buildCategoryContextFromQuery(searchParams: URLSearchParams) {
  const fromCategoryId = normalizeText(searchParams.get('categoryId'));
  const fromCategorySlug = normalizeSlug(searchParams.get('categorySlug'));
  const fromCategoryName = normalizeText(searchParams.get('categoryName'));
  const genericCategory = normalizeText(searchParams.get('category'));

  const categoryName = fromCategoryName || (fromCategoryId ? '' : genericCategory);
  const categorySlug = fromCategorySlug || normalizeSlug(genericCategory || categoryName);
  const categoryId = fromCategoryId || (!fromCategorySlug && !fromCategoryName ? genericCategory : '');

  return {
    categoryId: categoryId || '',
    categorySlug: categorySlug || '',
    categoryName: categoryName || '',
  };
}

function formatCountdown(msRemaining: number) {
  const totalSeconds = Math.max(0, Math.floor(msRemaining / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const hh = String(hours).padStart(2, '0');
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');

  if (days > 0) {
    return [`${days}d`, `${hh}h`, `${mm}m`, `${ss}s`].join(' | ');
  }
  return [`${hh}h`, `${mm}m`, `${ss}s`].join(' | ');
}

function buildPromoText(coupon: CouponRecord) {
  const code = normalizeCouponCode(coupon.code);
  const title = getCouponDisplayTitle(coupon);
  const percentage = Math.max(0, Number(coupon.discountPercentage || 0));

  if (coupon.scope === 'product') {
    return `${FIRE} Exclusive Deal: ${title} ${percentage}% OFF. Use: ${code}`;
  }

  if (coupon.scope === 'category') {
    return `${FIRE} Category Sale: ${title} items ${percentage}% OFF. Use: ${code}`;
  }

  return `${FIRE} Global Deal: ${percentage}% OFF on all products. Use: ${code}`;
}

function toCouponRecordFromProp(value: PromoCouponData | null | undefined) {
  if (!value) {
    return null;
  }

  const normalized = normalizeCoupon(value as Record<string, any>, normalizeText(value.code));
  if (!normalized.code) {
    return null;
  }
  return normalized;
}

async function resolveToolRouteContext(toolSlug: string) {
  if (!toolSlug) {
    return null;
  }

  try {
    const directSnapshot = await getDocs(
      query(collection(db, 'services'), where('slug', '==', toolSlug), limit(1))
    );

    if (!directSnapshot.empty) {
      const entry = directSnapshot.docs[0];
      const data = entry.data() as Record<string, unknown>;
      const categoryName = normalizeText(data.categoryName || data.category);
      const categorySlug = normalizeSlug((data as any).categorySlug || categoryName);
      const productSlug = normalizeSlug(data.slug || toolSlug);
      return {
        productId: entry.id,
        itemId: entry.id,
        toolId: entry.id,
        productSlug,
        slug: productSlug,
        categoryId: normalizeText(data.categoryId),
        categorySlug,
        categoryName,
      };
    }
  } catch (error) {
    console.error('Promo ticker direct tool context lookup failed:', error);
  }

  try {
    const snapshot = await getDocs(collection(db, 'services'));
    const fallbackDoc = snapshot.docs.find((entry) => {
      const data = entry.data() as Record<string, unknown>;
      const source = normalizeText(data.slug || data.title || data.name || entry.id);
      return normalizeSlug(source) === toolSlug && normalizeText(data.type || 'tools') === 'tools';
    });

    if (!fallbackDoc) {
      return {
        productSlug: toolSlug,
        slug: toolSlug,
      };
    }

    const data = fallbackDoc.data() as Record<string, unknown>;
    const categoryName = normalizeText(data.categoryName || data.category);
    const categorySlug = normalizeSlug((data as any).categorySlug || categoryName);
    const productSlug = normalizeSlug(data.slug || data.title || data.name || toolSlug);
    return {
      productId: fallbackDoc.id,
      itemId: fallbackDoc.id,
      toolId: fallbackDoc.id,
      productSlug,
      slug: productSlug,
      categoryId: normalizeText(data.categoryId),
      categorySlug,
      categoryName,
    };
  } catch (error) {
    console.error('Promo ticker fallback tool context lookup failed:', error);
    return {
      productSlug: toolSlug,
      slug: toolSlug,
    };
  }
}

export default function GlobalPromoTicker({ couponData }: { couponData?: PromoCouponData | null }) {
  const pathname = usePathname();
  const toast = useToast();

  const [routeContext, setRouteContext] = useState<CouponRouteContext>({ pathname });
  const [liveCoupons, setLiveCoupons] = useState<CouponRecord[]>([]);
  const [hiddenForSession, setHiddenForSession] = useState(() => {
    if (typeof window === 'undefined') {
      return false;
    }
    return sessionStorage.getItem(SESSION_HIDE_KEY) === '1';
  });
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [copied, setCopied] = useState(false);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const copiedTimeoutRef = useRef<number | null>(null);
  const isAdminRoute = pathname.startsWith('/admin');

  useEffect(() => {
    let cancelled = false;

    async function hydrateRouteContext() {
      const normalizedPath = normalizePath(pathname || '/');
      const queryString = typeof window !== 'undefined' ? window.location.search : '';
      const queryContext = buildCategoryContextFromQuery(new URLSearchParams(queryString));
      let nextContext: CouponRouteContext = {
        pathname: normalizedPath,
        ...queryContext,
      };

      if (normalizedPath.startsWith('/tools/category/')) {
        const categorySlugFromPath = normalizeSlug(normalizedPath.slice('/tools/category/'.length));
        nextContext = {
          ...nextContext,
          categorySlug: categorySlugFromPath || nextContext.categorySlug || '',
        };
      }

      const toolSlug = getToolSlugFromPath(normalizedPath);
      if (toolSlug) {
        const toolContext = await resolveToolRouteContext(toolSlug);
        if (cancelled) {
          return;
        }
        const resolvedProductSlug = normalizeSlug(
          (toolContext as Record<string, unknown> | null)?.productSlug || toolSlug
        );
        const resolvedSlug = normalizeSlug(
          (toolContext as Record<string, unknown> | null)?.slug || resolvedProductSlug || toolSlug
        );
        nextContext = {
          ...nextContext,
          ...(toolContext || {}),
          productSlug: resolvedProductSlug,
          slug: resolvedSlug,
        };
      }

      if (!cancelled) {
        setRouteContext(nextContext);
      }
    }

    void hydrateRouteContext();

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  useEffect(() => {
    if (isAdminRoute || couponData) {
      return;
    }

    const couponsQuery = query(collection(db, 'coupons'), where('active', '==', true));
    const unsubscribe = onSnapshot(
      couponsQuery,
      (snapshot) => {
        const options = snapshot.docs
          .map((docSnap) =>
            normalizeCoupon(docSnap.data() as Record<string, any>, docSnap.id)
          )
          .filter((entry) => Boolean(entry.code));
        setLiveCoupons(options);
      },
      (error) => {
        console.error('Failed to load promo ticker coupon:', error);
        setLiveCoupons([]);
      }
    );

    return () => unsubscribe();
  }, [isAdminRoute, couponData]);

  useEffect(() => {
    return () => {
      if (copiedTimeoutRef.current) {
        window.clearTimeout(copiedTimeoutRef.current);
      }
    };
  }, []);

  const externalCoupon = useMemo(() => toCouponRecordFromProp(couponData), [couponData]);
  const bestLiveCoupon = useMemo(
    () => pickBestCouponForRoute(liveCoupons, routeContext, nowMs),
    [liveCoupons, routeContext, nowMs]
  );

  const activeCoupon = useMemo(() => {
    if (externalCoupon) {
      return pickBestCouponForRoute([externalCoupon], routeContext, nowMs);
    }
    return bestLiveCoupon;
  }, [bestLiveCoupon, externalCoupon, routeContext, nowMs]);

  const expiryMs = toMillis(activeCoupon?.expiryDate);
  const hasExpiry = Boolean(expiryMs);
  const msRemaining = expiryMs - nowMs;
  const isExpired = Boolean(activeCoupon && hasExpiry && msRemaining <= 0);
  const shouldRender = !isAdminRoute && !hiddenForSession && Boolean(activeCoupon) && !isExpired;

  useEffect(() => {
    if (!shouldRender || !hasExpiry) {
      return;
    }

    const interval = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => window.clearInterval(interval);
  }, [hasExpiry, shouldRender]);

  useEffect(() => {
    const root = document.documentElement;
    if (!shouldRender || !rootRef.current) {
      root.style.setProperty('--promo-ticker-height', '0px');
      return;
    }

    const updateHeight = () => {
      const height = rootRef.current?.offsetHeight || 0;
      root.style.setProperty('--promo-ticker-height', `${height}px`);
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => {
      window.removeEventListener('resize', updateHeight);
    };
  }, [shouldRender, activeCoupon?.code, activeCoupon?.scope, activeCoupon?.productSlug, activeCoupon?.categoryId]);

  if (!shouldRender || !activeCoupon) {
    return null;
  }

  const couponCode = normalizeCouponCode(activeCoupon.code);
  const promoText = buildPromoText(activeCoupon);
  const countdown = hasExpiry ? formatCountdown(msRemaining) : 'LIVE NOW';
  const urgencyText = hasExpiry ? 'Hurry, grab now' : 'Limited time offer';

  async function handleCopyCode() {
    try {
      await navigator.clipboard.writeText(couponCode);
      setCopied(true);
      toast.success('Copied!', `Coupon ${couponCode} copied`);
      if (copiedTimeoutRef.current) {
        window.clearTimeout(copiedTimeoutRef.current);
      }
      copiedTimeoutRef.current = window.setTimeout(() => {
        setCopied(false);
      }, 1400);
    } catch (error) {
      console.error('Failed to copy promo code:', error);
      toast.error('Copy failed', 'Please copy code manually.');
    }
  }

  function handleClose() {
    setHiddenForSession(true);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(SESSION_HIDE_KEY, '1');
    }
  }

  return (
    <div
      ref={rootRef}
      className="fixed left-0 right-0 top-0 z-[9999] border-b border-black/25 bg-gradient-to-r from-[#FFD84D] via-[#FFCC00] to-[#FFC20D] px-2 py-2 sm:px-3.5"
    >
      <div className="mx-auto w-full">
        <div className="relative grid grid-cols-[1fr_auto] items-center gap-2">
          <div className="min-w-0">
            <div className="hidden md:flex items-center justify-center gap-3 text-center">
              <p className="truncate text-[14px] font-black text-black lg:text-[16px]">{promoText}</p>
              <span className="shrink-0 rounded-md bg-black/90 px-2.5 py-1 text-[11px] font-black text-[#FFCC00] lg:text-[12px]">
                {hasExpiry ? `${FIRE} Ends in` : `${FIRE} Live`}
              </span>
              <span className="shrink-0 rounded-md bg-black/90 px-3 py-1 text-[11px] font-black tabular-nums text-[#FFCC00] lg:text-[12px]">
                {countdown}
              </span>
              <span className="shrink-0 text-[14px] font-black text-black/80 lg:text-[16px]">{urgencyText}</span>
            </div>

            <div className="overflow-hidden whitespace-nowrap md:hidden">
              <div className="promo-marquee-track inline-flex items-center gap-6 pr-6">
                <span className="text-[13px] font-black text-black">{promoText}</span>
                <span className="rounded-md bg-black/90 px-2 py-1 text-[10px] font-black text-[#FFCC00]">
                  {hasExpiry ? `${FIRE} Ends in` : `${FIRE} Live`}
                </span>
                <span className="rounded-md bg-black/90 px-2.5 py-1 text-[11px] font-black tabular-nums text-[#FFCC00]">
                  {countdown}
                </span>
                <span className="text-[13px] font-black text-black/80">{urgencyText}</span>
                <span className="text-[13px] font-black text-black">{promoText}</span>
                <span className="rounded-md bg-black/90 px-2 py-1 text-[10px] font-black text-[#FFCC00]">
                  {hasExpiry ? `${FIRE} Ends in` : `${FIRE} Live`}
                </span>
                <span className="rounded-md bg-black/90 px-2.5 py-1 text-[11px] font-black tabular-nums text-[#FFCC00]">
                  {countdown}
                </span>
                <span className="text-[13px] font-black text-black/80">{urgencyText}</span>
              </div>
            </div>
          </div>

          <div className="relative flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                void handleCopyCode();
              }}
              className="inline-flex items-center gap-1.5 rounded-md bg-black/90 px-2.5 py-1.5 text-[11px] font-black text-[#FFCC00] shadow-[0_1px_0_rgba(0,0,0,0.2)]"
              aria-label={`Copy coupon code ${couponCode}`}
            >
              <Copy className="h-3.5 w-3.5" />
              Use Coupon: {couponCode}
            </button>
            {copied ? (
              <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 rounded bg-black px-2 py-1 text-[10px] font-black text-[#FFCC00]">
                Copied!
              </span>
            ) : null}

            <button
              type="button"
              onClick={handleClose}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-black/30 bg-black/10 text-black"
              aria-label="Close promo ticker"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
