'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { Copy, X } from 'lucide-react';
import { db } from '@/firebase';
import { useToast } from '@/components/ToastProvider';

const SESSION_HIDE_KEY = 'global_promo_ticker_hidden_v1';
const FIRE = '\uD83D\uDD25';

type CouponType = 'tool' | 'category';

export interface PromoCouponData {
  code: string;
  type: CouponType;
  targetName: string;
  expiryTime?: unknown;
  expiry_timestamp?: unknown;
}

function toMillis(value: unknown) {
  if (!value) {
    return 0;
  }
  if (typeof (value as any)?.toMillis === 'function') {
    return Number((value as any).toMillis() || 0);
  }
  if (typeof (value as any)?.toDate === 'function') {
    const date = (value as any).toDate();
    return date instanceof Date ? date.getTime() : 0;
  }
  if (value instanceof Date) {
    return value.getTime();
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value === 'string') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
  }
  return 0;
}

function normalizeText(value: unknown) {
  return String(value || '').trim();
}

function normalizeType(value: unknown): CouponType | null {
  const raw = normalizeText(value).toLowerCase();
  if (raw === 'tool' || raw === 'product') {
    return 'tool';
  }
  if (raw === 'category') {
    return 'category';
  }
  return null;
}

function formatCountdown(msRemaining: number) {
  const totalSeconds = Math.max(0, Math.floor(msRemaining / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return `${days}d ${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
  }
  return `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
}

function normalizeCategoryTarget(name: string) {
  const value = normalizeText(name);
  if (!value) {
    return 'Selected Category';
  }
  return value.replace(/\s+tools?\s*$/i, '').trim() || value;
}

function getPromoText(data: PromoCouponData) {
  if (data.type === 'tool') {
    return `${FIRE} Exclusive Discount: Get ${data.targetName} Pro now! Use Coupen: ${data.code}`;
  }
  const categoryTarget = normalizeCategoryTarget(data.targetName);
  return `${FIRE} Category Sale: All ${categoryTarget} tools are discounted! Use: ${data.code}`;
}

function mapBackendCoupon(raw: Record<string, unknown>): PromoCouponData | null {
  const code = normalizeText(raw.code).toUpperCase();
  const type = normalizeType(raw.type ?? raw.scope ?? raw.couponType);
  if (!code || !type) {
    return null;
  }

  const targetName =
    type === 'tool'
      ? normalizeText(raw.targetName || raw.productName || raw.productSlug || 'Featured Tool')
      : normalizeText(raw.targetName || raw.categoryName || 'Selected Category');

  const expiryTime = raw.expiry_timestamp ?? raw.expiryTime ?? raw.expiryDate ?? null;
  return {
    code,
    type,
    targetName: targetName || (type === 'tool' ? 'Featured Tool' : 'Selected Category'),
    expiryTime,
    expiry_timestamp: raw.expiry_timestamp,
  };
}

export default function GlobalPromoTicker({ couponData }: { couponData?: PromoCouponData | null }) {
  const pathname = usePathname();
  const toast = useToast();
  const [liveCoupon, setLiveCoupon] = useState<PromoCouponData | null>(null);
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
    if (isAdminRoute || couponData) {
      return;
    }

    const couponsQuery = query(collection(db, 'coupons'), where('active', '==', true));
    const unsubscribe = onSnapshot(
      couponsQuery,
      (snapshot) => {
        const options = snapshot.docs
          .map((docSnap) => mapBackendCoupon(docSnap.data() as Record<string, unknown>))
          .filter((entry): entry is PromoCouponData => Boolean(entry))
          .map((entry) => ({
            ...entry,
            expiryMs: toMillis(entry.expiry_timestamp ?? entry.expiryTime),
          }))
          .filter((entry) => entry.expiryMs > Date.now())
          .sort((a, b) => a.expiryMs - b.expiryMs);

        if (!options.length) {
          setLiveCoupon(null);
          return;
        }

        setLiveCoupon({
          code: options[0].code,
          type: options[0].type,
          targetName: options[0].targetName,
          expiryTime: options[0].expiryMs,
        });
      },
      (error) => {
        console.error('Failed to load promo ticker coupon:', error);
        setLiveCoupon(null);
      }
    );

    return () => unsubscribe();
  }, [isAdminRoute, couponData]);

  const activeCoupon = couponData || liveCoupon;
  const shouldTick = !isAdminRoute && !hiddenForSession && Boolean(activeCoupon);
  const expiryMs = toMillis(activeCoupon?.expiry_timestamp ?? activeCoupon?.expiryTime);
  const msRemaining = expiryMs - nowMs;
  const isExpired = !activeCoupon || !expiryMs || msRemaining <= 0;
  const shouldRender = !isAdminRoute && !hiddenForSession && !isExpired;

  useEffect(() => {
    if (!shouldTick) {
      return;
    }

    const interval = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => window.clearInterval(interval);
  }, [shouldTick]);

  useEffect(() => {
    return () => {
      if (copiedTimeoutRef.current) {
        window.clearTimeout(copiedTimeoutRef.current);
      }
    };
  }, []);

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
  }, [shouldRender, activeCoupon?.code, activeCoupon?.type, activeCoupon?.targetName]);

  if (!shouldRender || !activeCoupon) {
    return null;
  }

  const couponCode = activeCoupon.code;
  const promoText = getPromoText(activeCoupon);
  const countdown = formatCountdown(msRemaining);

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
              <span className="shrink-0 rounded-md bg-black/90 px-3 py-1 text-[11px] font-black tabular-nums text-[#FFCC00] lg:text-[12px]">
                {FIRE} {countdown}
              </span>
            </div>

            <div className="overflow-hidden whitespace-nowrap md:hidden">
              <div className="promo-marquee-track inline-flex items-center gap-6 pr-6">
                <span className="text-[13px] font-black text-black">{promoText}</span>
                <span className="rounded-md bg-black/90 px-2.5 py-1 text-[11px] font-black tabular-nums text-[#FFCC00]">
                  {FIRE} {countdown}
                </span>
                <span className="text-[13px] font-black text-black">{promoText}</span>
                <span className="rounded-md bg-black/90 px-2.5 py-1 text-[11px] font-black tabular-nums text-[#FFCC00]">
                  {FIRE} {countdown}
                </span>
              </div>
            </div>
          </div>

          <div className="relative flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                void handleCopyCode();
              }}
              className="inline-flex items-center gap-1.5 rounded-md border-2 border-dashed border-black bg-black/10 px-2.5 py-1.5 text-[11px] font-black text-black"
              aria-label={`Copy coupon code ${couponCode}`}
            >
              <Copy className="h-3.5 w-3.5" />
              {FIRE} {couponCode}
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
