'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import { collection, getDocs, limit, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/firebase';
import {
  type CouponRecord,
  getCouponDisplayTitle,
  isCouponExpired,
  isCouponVisibleForRoute,
  normalizeCoupon,
  toMillis,
} from '@/lib/coupons';

type ProductRouteContext = {
  productId: string;
  productSlug: string;
  categoryId: string;
  categoryName: string;
};

function formatCountdown(msRemaining: number) {
  const safeSeconds = Math.max(0, Math.floor(msRemaining / 1000));
  const days = Math.floor(safeSeconds / 86400);
  const hours = Math.floor((safeSeconds % 86400) / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  if (days > 0) {
    return `${days} day${days === 1 ? '' : 's'} ${hours}h ${minutes}m ${seconds}s`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

function toSlug(value: unknown) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-');
}

export default function GlobalPromoTicker() {
  const pathname = usePathname();
  const [coupons, setCoupons] = useState<CouponRecord[]>([]);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [rotationIndex, setRotationIndex] = useState(0);
  const [productContext, setProductContext] = useState<ProductRouteContext | null>(null);
  const [copiedCode, setCopiedCode] = useState('');
  const copiedTimeoutRef = useRef<number | null>(null);

  const isAdminRoute = pathname.startsWith('/admin');

  useEffect(() => {
    if (isAdminRoute) {
      return;
    }

    const couponsQuery = query(collection(db, 'coupons'), where('active', '==', true));
    const unsubscribe = onSnapshot(
      couponsQuery,
      (snapshot) => {
        const normalized = snapshot.docs
          .map((entry) => normalizeCoupon(entry.data() as Record<string, any>, entry.id))
          .filter((coupon) => coupon.active && coupon.code && coupon.discountPercentage > 0)
          .filter((coupon) => !isCouponExpired(coupon));

        normalized.sort((a, b) => {
          const discountDiff = Number(b.discountPercentage || 0) - Number(a.discountPercentage || 0);
          if (discountDiff !== 0) {
            return discountDiff;
          }

          const aExpiry = toMillis(a.expiryDate);
          const bExpiry = toMillis(b.expiryDate);

          if (aExpiry && bExpiry) {
            return aExpiry - bExpiry;
          }
          if (aExpiry) {
            return -1;
          }
          if (bExpiry) {
            return 1;
          }
          return a.code.localeCompare(b.code);
        });

        setCoupons(normalized);
      },
      (error) => {
        console.error('Failed to load active promo coupons:', error);
        setCoupons([]);
      }
    );

    return () => unsubscribe();
  }, [isAdminRoute]);

  useEffect(() => {
    if (isAdminRoute) {
      return;
    }

    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [isAdminRoute]);

  useEffect(() => {
    if (isAdminRoute) {
      return;
    }

    if (!pathname.startsWith('/tools/')) {
      return;
    }

    let cancelled = false;
    const slug = decodeURIComponent(pathname.replace('/tools/', '').split('/')[0] || '').trim().toLowerCase();
    if (!slug) {
      return;
    }

    async function loadProductContext() {
      try {
        const direct = await getDocs(query(collection(db, 'services'), where('slug', '==', slug), limit(1)));
        if (!cancelled && !direct.empty) {
          const snap = direct.docs[0];
          const data = snap.data() as Record<string, any>;
          setProductContext({
            productId: snap.id,
            productSlug: toSlug(data.slug || data.name || data.title || slug),
            categoryId: String(data.categoryId || ''),
            categoryName: String(data.categoryName || data.category || ''),
          });
          return;
        }

        const fallback = await getDocs(collection(db, 'services'));
        if (cancelled) {
          return;
        }
        const found = fallback.docs.find((entry) => {
          const data = entry.data() as Record<string, any>;
          const derived = toSlug(data.slug || data.name || data.title || '');
          return derived === slug;
        });

        if (!found) {
          setProductContext(null);
          return;
        }

        const data = found.data() as Record<string, any>;
        setProductContext({
          productId: found.id,
          productSlug: toSlug(data.slug || data.name || data.title || slug),
          categoryId: String(data.categoryId || ''),
          categoryName: String(data.categoryName || data.category || ''),
        });
      } catch (error) {
        console.error('Failed to resolve route product context for promo ticker:', error);
        if (!cancelled) {
          setProductContext(null);
        }
      }
    }

    void loadProductContext();

    return () => {
      cancelled = true;
    };
  }, [pathname, isAdminRoute]);

  const eligibleCoupons = useMemo(() => {
    const context = {
      pathname,
      productId: productContext?.productId || '',
      productSlug: productContext?.productSlug || '',
      categoryId: productContext?.categoryId || '',
      categoryName: productContext?.categoryName || '',
    };
    return coupons.filter((coupon) => isCouponVisibleForRoute(coupon, context));
  }, [coupons, pathname, productContext]);

  useEffect(() => {
    if (eligibleCoupons.length <= 1) {
      return;
    }

    const timer = window.setInterval(() => {
      setRotationIndex((prev) => (prev + 1) % eligibleCoupons.length);
    }, 6000);

    return () => {
      window.clearInterval(timer);
    };
  }, [eligibleCoupons.length]);

  useEffect(() => {
    return () => {
      if (copiedTimeoutRef.current) {
        window.clearTimeout(copiedTimeoutRef.current);
      }
    };
  }, []);

  if (isAdminRoute) {
    return null;
  }

  const activeCoupon = eligibleCoupons.length > 0 ? eligibleCoupons[rotationIndex % eligibleCoupons.length] : null;
  const hasCountdown = Boolean(activeCoupon?.expiryDate && toMillis(activeCoupon.expiryDate) > nowMs);
  const countdown = hasCountdown && activeCoupon ? formatCountdown(toMillis(activeCoupon.expiryDate) - nowMs) : '';
  const title = activeCoupon ? getCouponDisplayTitle(activeCoupon) : 'AI Tools';
  const discountText = activeCoupon ? `${activeCoupon.discountPercentage}% OFF` : 'HOT DEAL';
  const couponCode = activeCoupon?.code || 'DEAL';

  async function handleCopyCoupon() {
    try {
      if (typeof window !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(couponCode);
      } else if (typeof window !== 'undefined') {
        const temp = document.createElement('textarea');
        temp.value = couponCode;
        temp.setAttribute('readonly', '');
        temp.style.position = 'absolute';
        temp.style.left = '-9999px';
        document.body.appendChild(temp);
        temp.select();
        document.execCommand('copy');
        document.body.removeChild(temp);
      }

      setCopiedCode(couponCode);
      if (copiedTimeoutRef.current) {
        window.clearTimeout(copiedTimeoutRef.current);
      }
      copiedTimeoutRef.current = window.setTimeout(() => {
        setCopiedCode('');
      }, 1600);
    } catch (error) {
      console.error('Failed to copy coupon code:', error);
    }
  }

  return (
    <div className="fixed top-0 inset-x-0 z-[120] border-b border-primary/20 bg-[#070707]/90 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 py-2.5">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="rounded-2xl border border-primary/35 bg-gradient-to-r from-[#0F0F10] via-[#161616] to-[#0F0F10] px-2.5 py-2 sm:px-3.5 sm:py-2.5 shadow-[0_10px_24px_rgba(0,0,0,0.45)]"
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2.5">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeCoupon?.id || 'fallback-left'}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 6 }}
                transition={{ duration: 0.25 }}
                className="min-w-0 flex-1 rounded-xl bg-primary px-3 py-2 text-black"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <Image src="/confetti-left.svg" alt="" width={14} height={14} className="w-3.5 h-3.5 shrink-0" />
                  <p className="truncate text-[10px] sm:text-[11px] md:text-sm font-black uppercase tracking-[0.05em]">
                    {title} - {discountText}
                  </p>
                </div>
              </motion.div>
            </AnimatePresence>

            <div className="flex items-center justify-between gap-2 sm:gap-2.5 sm:ml-auto">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  void handleCopyCoupon();
                }}
                className="relative shrink-0 rounded-xl border border-primary/50 bg-black/85 px-2.5 py-2 text-center min-w-[96px] sm:min-w-[112px]"
                aria-label={`Copy coupon code ${couponCode}`}
              >
                <span className="block text-[10px] sm:text-xs font-black uppercase tracking-[0.16em] text-primary glow-text">
                  [ {couponCode} ]
                </span>
                <span className="block mt-0.5 text-[8px] sm:text-[9px] font-bold uppercase tracking-[0.12em] text-brand-text/50">
                  {copiedCode === couponCode ? 'Copied' : 'Tap to copy'}
                </span>
              </motion.button>

              <div className="min-w-0 max-w-[58vw] sm:max-w-none rounded-xl border border-white/10 bg-[#1A1A1C] px-2.5 py-2">
                <div className="flex flex-wrap items-center gap-1.5 text-[10px] sm:text-xs font-black tracking-[0.06em] uppercase whitespace-normal sm:whitespace-nowrap leading-tight">
                  <span className="text-primary glow-text">Grab it</span>
                  {hasCountdown ? (
                    <span className="text-brand-text tabular-nums">{countdown}</span>
                  ) : null}
                  <span className="text-primary glow-text">Fast</span>
                  <Image src="/confetti-right.svg" alt="" width={14} height={14} className="w-3.5 h-3.5 shrink-0" />
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
