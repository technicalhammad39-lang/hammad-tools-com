'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import {
  Shield,
  Award,
  CheckCircle2,
  ArrowLeft,
  MessageCircle,
  Minus,
  Plus,
  Clock,
  Sparkles,
  Star,
  User,
  Users,
  X
} from 'lucide-react';
import Link from 'next/link';
import { collection, query, where, addDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase';
import { createOrderPublicId } from '@/lib/order-system';
import { resolveImageSource } from '@/lib/image-display';
import type { StoredFileMetadata } from '@/lib/types/domain';
import UploadedImage from '@/components/UploadedImage';
import { useAuth } from '@/context/AuthContext';

interface Plan {
  planName: string;
  ourPrice: number;
  officialPrice: number;
  benefits: string[];
}

interface Service {
  id: string;
  name: string;
  slug?: string;
  description: string;
  price: number;
  salePrice?: number;
  image: string;
  category: string;
  features?: string[];
  active?: boolean;
  orderIndex?: number;
  longDescription?: string;
  deliveryStatus?: string;
  accessType?: string;
  accessLabel?: string;
  warranty?: string;
  duration?: string;
  planType?: string;
  thumbnail?: string;
  imageMedia?: StoredFileMetadata | null;
  plans?: Plan[];
}

interface ReviewRecord {
  id: string;
  serviceSlug: string;
  serviceId?: string;
  userName: string;
  userEmailMasked?: string;
  userPhotoURL?: string;
  text: string;
  rating: number;
  createdAt?: any;
}

function buildServiceSlug(service: Service) {
  const source = (service.slug || service.name || service.id || '').toString();
  return source.toLowerCase().trim().replace(/\s+/g, '-');
}

function timestampToMillis(value: any) {
  if (!value) return 0;
  if (typeof value?.toMillis === 'function') return Number(value.toMillis() || 0);
  if (typeof value?.toDate === 'function') {
    const date = value.toDate();
    return date instanceof Date ? date.getTime() : 0;
  }
  if (value instanceof Date) return value.getTime();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}

function maskEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  if (!normalized || !normalized.includes('@')) {
    return '';
  }

  const [local, domain] = normalized.split('@');
  const localStart = local.slice(0, 2);
  const localMask = '*'.repeat(Math.max(1, Math.min(6, local.length - 2)));
  return `${localStart}${localMask}@${domain}`;
}

function formatPriceLabel(amount: number) {
  if (!Number.isFinite(amount)) {
    return '0';
  }
  const normalized = Number(amount.toFixed(2));
  if (Number.isInteger(normalized)) {
    return String(normalized);
  }
  return normalized.toFixed(2).replace(/\.?0+$/, '');
}

export default function ServiceDetailClient({ service, loading }: { service: Service | null, loading: boolean }) {
  const router = useRouter();
  const { user, profile } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [quantity, setQuantity] = useState(1);
  const reviewsSectionRef = React.useRef<HTMLDivElement | null>(null);
  const [showReviewQuickJump, setShowReviewQuickJump] = useState(true);

  // Reviews State
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [reviewName, setReviewName] = useState('');
  const [reviewText, setReviewText] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewFormMessage, setReviewFormMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );
  const heroImageSrc = resolveImageSource(service, {
    mediaPaths: ['imageMedia'],
    stringPaths: ['thumbnail', 'image'],
    placeholder: '/services-card.webp',
  });

  useEffect(() => {
    if (!profile?.displayName && !user?.displayName) {
      return;
    }
    setReviewName((current) => current || profile?.displayName || user?.displayName || '');
  }, [profile?.displayName, user?.displayName]);

  useEffect(() => {
    if (!service) return;
    const slug = buildServiceSlug(service);
    const q = query(
      collection(db, 'service_reviews'),
      where('serviceSlug', '==', slug)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedReviews = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<ReviewRecord, 'id'>),
      }));
      fetchedReviews.sort((a, b) => timestampToMillis(b.createdAt) - timestampToMillis(a.createdAt));
      setReviews(fetchedReviews);
    }, (error) => {
      console.error('Failed to load service reviews:', error);
      setReviews([]);
    });
    return () => unsubscribe();
  }, [service]);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewName.trim() || !reviewText.trim() || !service) return;
    setIsSubmittingReview(true);

    try {
      setReviewFormMessage(null);
      const slug = buildServiceSlug(service);
      const maskedEmail = maskEmail(profile?.email || user?.email || '');
      const payload: Record<string, unknown> = {
        serviceSlug: slug,
        serviceId: service.id,
        userName: (profile?.displayName || user?.displayName || reviewName).trim(),
        userEmailMasked: maskedEmail || null,
        userPhotoURL: (profile?.photoURL || user?.photoURL || '').trim() || null,
        text: reviewText.trim(),
        rating: reviewRating,
        createdAt: serverTimestamp(),
      };
      await addDoc(collection(db, 'service_reviews'), payload);
      setReviewName(profile?.displayName || user?.displayName || '');
      setReviewText('');
      setReviewRating(5);
      setReviewFormMessage({ type: 'success', text: 'Review submitted successfully.' });
      setIsReviewModalOpen(false);
    } catch (error) {
      console.error('Error submitting review: ', error);
      setReviewFormMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to submit review.',
      });
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const displayPlans = useMemo(() => {
    if (!service) return [];
    if (service.plans && service.plans.length > 0) {
      return service.plans.map((p: any) => {
        const ourPrice = Number(p.ourPrice ?? p.salePrice ?? p.price ?? 0);
        const officialPrice = Number(p.officialPrice ?? p.originalPrice ?? 0);
        const benefits = Array.isArray(p.benefits)
          ? p.benefits
          : typeof p.benefits === 'string'
            ? p.benefits.split(',').map((benefit: string) => benefit.trim()).filter(Boolean)
            : [];

        return {
          planName: p.planName || p.name || 'Standard Access',
          ourPrice,
          officialPrice,
          benefits,
        };
      });
    }

    return [
      {
        planName: 'Standard Plan',
        ourPrice: service.price,
        officialPrice: Number(service.salePrice || 0),
        benefits: service.features || ['Premium Access', 'Instant Delivery'],
      },
    ];
  }, [service]);

  useEffect(() => {
    if (displayPlans.length > 0) {
      setSelectedPlan(displayPlans[0]);
    }
  }, [displayPlans]);

  useEffect(() => {
    const onScroll = () => {
      setShowReviewQuickJump(window.scrollY < 420);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-brand-bg"><div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin shadow-2xl shadow-primary/20" /></div>;
  if (!service) return <div className="min-h-screen flex flex-col items-center justify-center text-brand-text bg-brand-bg">
    <Shield className="w-20 h-20 text-accent mb-6 opacity-20" />
    <h2 className="text-3xl font-black uppercase mb-4">Tool Not Found</h2>
    <Link href="/tools" className="px-10 py-4 bg-primary text-black rounded-2xl font-black uppercase tracking-widest text-xs border-b-4 border-secondary transition-all hover:scale-105 active:scale-95">Back to Tools</Link>
  </div>;

  const currentPrice = selectedPlan ? selectedPlan.ourPrice : service.price;
  const currentOfficialPrice = selectedPlan
    ? (selectedPlan.officialPrice && selectedPlan.officialPrice > currentPrice ? selectedPlan.officialPrice : 0)
    : (Number(service.salePrice || 0) > currentPrice ? Number(service.salePrice) : 0);
  const totalPrice = formatPriceLabel(currentPrice * quantity);
  const totalOfficialPrice = formatPriceLabel(currentOfficialPrice * quantity);
  const savingsPercent = currentOfficialPrice > currentPrice
    ? Math.round(((currentOfficialPrice - currentPrice) / currentOfficialPrice) * 100)
    : 0;
  const averageRating = reviews.length
    ? Math.max(
        0,
        Math.min(
          5,
          reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviews.length
        )
      )
    : 0;

  const handleOrder = () => {
    const planName = selectedPlan?.planName || 'Standard';
    const params = new URLSearchParams({
      productId: service.id,
      quantity: String(quantity),
      plan: planName,
      orderId: createOrderPublicId(),
    });
    const checkoutPath = `/checkout?${params.toString()}`;
    if (!user) {
      router.push(`/login?next=${encodeURIComponent(checkoutPath)}`);
      return;
    }
    router.push(checkoutPath);
  };

  const handleScrollToReviews = () => {
    reviewsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen page-navbar-spacing pb-20 bg-brand-bg relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full -z-10" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-secondary/5 blur-[120px] rounded-full -z-10" />

      {showReviewQuickJump ? (
        <button
          type="button"
          onClick={handleScrollToReviews}
          className="fixed right-3 sm:right-4 bottom-24 md:bottom-8 z-[70] rounded-xl border border-primary/40 bg-[#0E0E0E]/90 p-1.5 shadow-[0_12px_28px_rgba(255,214,0,0.3)]"
          aria-label="Scroll to reviews"
        >
          <UploadedImage
            src="/review-get.png"
            fallbackSrc={null}
            fallbackOnError={false}
            alt="Write review"
            className="h-10 sm:h-11 w-auto object-contain"
          />
        </button>
      ) : null}

      <div className="site-container">
        <button 
          onClick={() => router.back()} 
          className="group inline-flex items-center space-x-3 text-brand-text/40 hover:text-primary mb-4 sm:mb-12 transition-all p-1 sm:p-2 rounded-xl hover:bg-white/5"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="uppercase font-black tracking-[0.2em] text-[10px]">Back to Tools</span>
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 md:gap-10 lg:gap-20">

          {/* Left Column: Visuals & Meta (5 cols) */}
          <div className="lg:col-span-5 space-y-4 md:space-y-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative aspect-video md:aspect-square rounded-3xl md:rounded-[3.5rem] overflow-hidden border border-white/10 shadow-3xl group max-h-[40vh] md:max-h-none"
            >
              <UploadedImage
                src={heroImageSrc}
                fallbackSrc="/services-card.webp"
                alt={service.name}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                referrerPolicy="no-referrer"
                fetchPriority="high"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute bottom-6 left-6 right-6 flex flex-col items-start gap-2">
                <span className="bg-primary/20 backdrop-blur-md text-primary px-4 py-1.5 rounded-lg font-black tracking-widest text-[8px] border border-primary/20 whitespace-pre-wrap break-words">
                  {service.category}
                </span>
              </div>
            </motion.div>

            {/* Quick Badges */}
            <div className="grid grid-cols-2 gap-2.5 md:gap-4">
              <div className="glass p-3 sm:p-5 rounded-2xl md:rounded-3xl border border-white/5 flex flex-row items-center text-left gap-2.5 md:gap-3 group h-auto">
                <Sparkles className="w-5 h-5 md:w-6 md:h-6 text-brand-text/70 group-hover:scale-110 transition-transform flex-shrink-0" />
                <div>
                  <div className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-white/70 mb-0.5">Delivery</div>
                  <div className="text-[10px] md:text-xs font-black text-white leading-tight whitespace-pre-wrap break-words">{service.deliveryStatus || 'Instant'}</div>
                </div>
              </div>
              <div className="glass p-3 sm:p-5 rounded-2xl md:rounded-3xl border border-white/5 flex flex-row items-center text-left gap-2.5 md:gap-3 group h-auto">
                <Clock className="w-5 h-5 md:w-6 md:h-6 text-brand-text/70 group-hover:scale-110 transition-transform flex-shrink-0" />
                <div>
                  <div className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-white/70 mb-0.5">Access</div>
                  <div className="text-[10px] md:text-xs font-black text-white leading-tight whitespace-pre-wrap break-words">{service.accessLabel || service.accessType || 'Shared'}</div>
                </div>
              </div>
              <div className="glass p-3 sm:p-5 rounded-2xl md:rounded-3xl border border-white/5 flex flex-row items-center text-left gap-2.5 md:gap-3 group h-auto">
                <Shield className="w-5 h-5 md:w-6 md:h-6 text-brand-text/70 group-hover:scale-110 transition-transform flex-shrink-0" />
                <div>
                  <div className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-white/70 mb-0.5">Warranty</div>
                  <div className="text-[10px] md:text-xs font-black text-white leading-tight whitespace-pre-wrap break-words">{service.warranty || 'Full'}</div>
                </div>
              </div>
              <div className="glass p-3 sm:p-5 rounded-2xl md:rounded-3xl border border-white/5 flex flex-row items-center text-left gap-2.5 md:gap-3 group h-auto">
                <Users className="w-5 h-5 md:w-6 md:h-6 text-brand-text/70 group-hover:scale-110 transition-transform flex-shrink-0" />
                <div>
                  <div className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-white/70 mb-0.5">Plan Type</div>
                  <div className="text-[10px] md:text-xs font-black text-white leading-tight whitespace-pre-wrap break-words">{service.planType || 'Individual'}</div>
                </div>
              </div>
            </div>

            {/* License Quantity */}
            <div className="hidden md:grid grid-cols-1 gap-4 pt-1">
              <div className="glass p-5 rounded-2xl md:rounded-3xl border border-white/5 space-y-4">
                <label className="text-[10px] font-black uppercase tracking-widest text-brand-text/30">License Quantity</label>
                <div className="flex items-center justify-between gap-4 bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-11 h-11 rounded-xl glass border border-white/5 flex items-center justify-center text-brand-text hover:bg-primary hover:text-black transition-all"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="text-xl font-black text-brand-text">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-11 h-11 rounded-xl glass border border-white/5 flex items-center justify-center text-brand-text hover:bg-primary hover:text-black transition-all"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: Pricing & Purchase (7 cols) */}
          <div className="lg:col-span-7 space-y-5 md:space-y-8">
            <div>
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-4xl sm:text-5xl md:text-8xl font-black mb-3 md:mb-6 text-brand-text leading-[0.94] whitespace-pre-wrap break-words"
              >
                {service.name}
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-brand-text/50 text-base md:text-lg font-medium leading-relaxed max-w-2xl"
              >
                {service.longDescription || service.description}
              </motion.p>
            </div>

            {/* Plan Selection */}
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <Award className="w-6 h-6 text-primary" />
                <h3 className="text-xl font-black uppercase text-brand-text">Select your plan</h3>
              </div>

              {/* Horizontal Scrollable Row */}
              <div className="relative">
              <div className="flex overflow-x-auto gap-3 sm:gap-4 pb-4 snap-x hide-scrollbar">
                {displayPlans.map((plan: Plan, i: number) => (
                  <button
                    key={i}
                    onClick={() => setSelectedPlan(plan)}
                    className={`snap-center shrink-0 relative min-w-[9rem] sm:min-w-[11rem] max-w-[72vw] sm:max-w-none px-4 sm:px-6 py-3 rounded-2xl border text-center transition-all ${
                      selectedPlan?.planName === plan.planName
                        ? 'bg-green-500 text-black font-black shadow-lg shadow-green-500/30 border-green-500'
                        : 'glass text-brand-text font-bold border-white/5 hover:border-white/20'
                    }`}
                  >
                    <div className="text-[10px] sm:text-xs leading-tight tracking-[0.16em] whitespace-normal sm:whitespace-nowrap flex items-center justify-center gap-2">
                       {selectedPlan?.planName === plan.planName && <CheckCircle2 className="w-4 h-4 text-black" />}
                      {plan.planName}
                    </div>
                  </button>
                ))}
              </div>
              </div>

              {/* Dynamic Benefits Box */}
              {selectedPlan && (
                <div className="glass p-8 rounded-[2.5rem] border border-white/5 space-y-6 shadow-xl">
                  <div className="flex flex-col gap-4">
                    <h4 className="text-sm font-black uppercase tracking-widest text-brand-text/60 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary" /> {selectedPlan.planName} Core Benefits
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6">
                      {selectedPlan.benefits.map((b, idx) => (
                        <div key={idx} className="flex items-center gap-3">
                          <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                          <span className="text-xs font-bold text-brand-text/80 tracking-wide">{b}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Relocated Pricing Display */}
                  <div className="pt-6 border-t border-white/5 flex flex-col gap-2">
                    <div className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-text/30">Instant Activation Price</div>
                    <div className="flex flex-row items-center gap-4 flex-wrap">
                      <div className="flex items-baseline gap-1">
                        <span className="text-xs font-black text-primary uppercase">Rs</span>
                        <span className="text-5xl md:text-6xl font-black text-brand-text leading-none">{totalPrice}</span>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        {currentOfficialPrice > currentPrice && (
                          <span className="text-sm md:text-base font-black text-red-500/60 line-through decoration-red-500/40">Rs {totalOfficialPrice}</span>
                        )}
                        {savingsPercent > 0 && (
                          <div className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest shrink-0 shadow-lg shadow-emerald-500/5">
                            Save {savingsPercent}%
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-1">
               {/* Mobile Sticky CTA */}
               <div className="fixed bottom-0 left-0 w-full z-[60] p-4 bg-brand-bg/95 backdrop-blur-3xl md:relative md:bg-transparent md:p-0 md:mt-8 md:w-auto border-t border-white/5 md:border-0 shadow-[0_-10px_40px_rgba(0,0,0,0.8)] md:shadow-none">
                 <div className="flex items-center gap-2 md:block">
                   <div className="md:hidden h-14 flex items-center bg-white/5 border border-white/10 rounded-2xl px-2 gap-1.5">
                     <button
                       onClick={() => setQuantity(Math.max(1, quantity - 1))}
                       className="w-10 h-10 rounded-xl glass border border-white/5 flex items-center justify-center text-brand-text hover:bg-primary hover:text-black transition-all"
                       aria-label="Decrease quantity"
                     >
                       <Minus className="w-4 h-4" />
                     </button>
                     <span className="min-w-[2ch] text-center text-base font-black text-brand-text">{quantity}</span>
                     <button
                       onClick={() => setQuantity(quantity + 1)}
                       className="w-10 h-10 rounded-xl glass border border-white/5 flex items-center justify-center text-brand-text hover:bg-primary hover:text-black transition-all"
                       aria-label="Increase quantity"
                     >
                       <Plus className="w-4 h-4" />
                     </button>
                   </div>
                   <motion.button
                     whileHover={{ scale: 1.02 }}
                     whileTap={{ scale: 0.98 }}
                     onClick={handleOrder}
                     className="flex-1 w-full h-14 md:h-auto bg-primary text-brand-bg px-5 md:px-10 py-4 md:py-6 rounded-2xl md:rounded-[2rem] font-black uppercase tracking-[0.2em] text-[10px] md:text-sm flex items-center justify-center gap-2.5 md:gap-4 border-b-[6px] md:border-b-8 border-[#FF8C2A] shadow-2xl shadow-primary/20 hover:shadow-primary/40 active:border-b-0 active:translate-y-2 transition-all group"
                   >
                     <span>Buy Now (Rs {totalPrice})</span>
                     <MessageCircle className="w-4 h-4 md:w-6 md:h-6 transition-transform group-hover:rotate-12" />
                   </motion.button>
                 </div>
               </div>
            </div>

            <div className="mt-1 md:mt-2">
              <div className="relative overflow-hidden rounded-lg md:rounded-2xl border border-emerald-500/20 bg-emerald-500/10 py-2 md:py-3 px-2.5 md:px-3">
                <motion.div
                  animate={{ x: ['0%', '-50%'] }}
                  transition={{ duration: 13, repeat: Infinity, ease: 'linear' }}
                  className="flex w-max items-center gap-10 whitespace-nowrap pr-10"
                >
                  <div className="inline-flex items-center gap-2.5">
                    <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <p className="text-[9px] md:text-[10px] font-black text-emerald-400 uppercase tracking-[0.12em]">
                      Secure checkout with payment proof, admin verification, and realtime order tracking.
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-2.5">
                    <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <p className="text-[9px] md:text-[10px] font-black text-emerald-400 uppercase tracking-[0.12em]">
                      Secure checkout with payment proof, admin verification, and realtime order tracking.
                    </p>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </div>

        {/* Customer Reviews Section */}
        <div ref={reviewsSectionRef} className="mt-6 pt-6 md:mt-12 md:pt-12 border-t border-white/5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8 items-start">
            <div className="glass p-4 sm:p-5 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border border-white/5 shadow-2xl min-h-0 lg:min-h-[520px] flex flex-col">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <Star className="w-5 h-5 md:w-7 md:h-7 text-primary fill-primary" />
                  <h3 className="text-lg sm:text-xl md:text-3xl font-black uppercase text-brand-text">Customer Reviews</h3>
                </div>
                <span className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-brand-text/40">
                  {reviews.length} total
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5 mb-4">
                <div className="bg-white/[0.03] border border-white/5 rounded-xl md:rounded-2xl p-3 md:p-4">
                  <div className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-brand-text/40 mb-1.5">Average</div>
                  <div className="text-xl md:text-2xl font-black text-brand-text">{averageRating.toFixed(1)}</div>
                </div>
                <div className="bg-white/[0.03] border border-white/5 rounded-xl md:rounded-2xl p-3 md:p-4">
                  <div className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-brand-text/40 mb-1.5">Total Reviews</div>
                  <div className="text-xl md:text-2xl font-black text-brand-text">{reviews.length}</div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsReviewModalOpen(true)}
                className="lg:hidden mb-4 w-full bg-primary text-black py-3.5 rounded-xl font-black uppercase tracking-[0.18em] text-[10px] border-b-4 border-secondary shadow-xl shadow-primary/15"
              >
                Write Review
              </button>

              {reviewFormMessage ? (
                <p className={`text-[9px] font-black uppercase tracking-widest mb-3 ${reviewFormMessage.type === 'success' ? 'text-emerald-400' : 'text-accent'}`}>
                  {reviewFormMessage.text}
                </p>
              ) : null}

              {reviews.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-10 bg-white/[0.02] border border-white/5 rounded-[1.2rem] md:rounded-[1.5rem] text-center">
                  <Star className="w-10 h-10 md:w-12 md:h-12 text-brand-text/10 mb-3" />
                  <p className="text-brand-text/40 font-bold uppercase tracking-widest text-xs md:text-sm">No reviews yet.</p>
                  <p className="text-[9px] md:text-[10px] text-brand-text/20 mt-1 uppercase tracking-widest">Be the first to review!</p>
                </div>
              ) : (
                <div className="flex-1 space-y-2.5 md:space-y-4 max-h-[360px] md:max-h-[430px] overflow-y-auto pr-1 no-scrollbar" data-lenis-prevent>
                  {reviews.map((review) => {
                    const maskedIdentity = review.userEmailMasked || '';
                    const displayName = review.userName || 'Customer';
                    return (
                      <motion.div
                        key={review.id}
                        className="p-3.5 md:p-5 rounded-xl md:rounded-2xl border border-white/5 bg-white/[0.02] hover:border-primary/20 transition-all shadow-xl"
                      >
                        <div className="flex items-start gap-2.5 md:gap-3">
                          {review.userPhotoURL ? (
                            <UploadedImage
                              src={review.userPhotoURL}
                              fallbackSrc="/services-card.webp"
                              alt={displayName}
                              className="w-9 h-9 md:w-11 md:h-11 rounded-full object-cover border border-white/10 shrink-0"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-9 h-9 md:w-11 md:h-11 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
                              <User className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1 mb-1.5">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-3.5 h-3.5 md:w-4 md:h-4 ${i < Number(review.rating || 0) ? 'fill-primary text-primary' : 'text-brand-text/20'}`}
                                />
                              ))}
                            </div>
                            <p className="text-sm md:text-base font-medium text-brand-text/85 leading-relaxed mb-2 whitespace-pre-wrap break-words">
                              {review.text}
                            </p>
                            <div className="text-[9px] md:text-[10px] font-black tracking-widest text-brand-text/65 whitespace-pre-wrap break-words">
                              {displayName}
                            </div>
                            {maskedIdentity ? (
                              <div className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-brand-text/35 mt-1">
                                {maskedIdentity}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="hidden lg:flex glass p-7 md:p-8 rounded-[2rem] border border-white/5 shadow-2xl min-h-[520px] flex-col">
              <h4 className="text-2xl font-black uppercase tracking-widest text-brand-text mb-2 text-center">Share Your Experience</h4>
              <p className="text-center text-brand-text/40 text-xs font-black uppercase tracking-widest mb-7">
                Help others by leaving a review after purchase
              </p>

              <form onSubmit={handleReviewSubmit} className="space-y-6 flex-1 flex flex-col">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-brand-text/40 mb-2 block">Your Name</label>
                    <input
                      type="text"
                      required
                      placeholder="Enter identity"
                      value={reviewName}
                      onChange={(e) => setReviewName(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-sm focus:outline-none focus:border-primary transition-colors text-brand-text"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-brand-text/40 mb-2 block">Rate Service</label>
                    <div className="flex gap-2 items-center h-[54px]">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setReviewRating(star)}
                          className="focus:outline-none hover:scale-125 transition-transform"
                        >
                          <Star className={`w-8 h-8 ${star <= reviewRating ? 'fill-primary text-primary' : 'text-brand-text/20 hover:text-primary/50'}`} />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex-1 flex flex-col">
                  <label className="text-[10px] font-black uppercase tracking-widest text-brand-text/40 mb-2 block">Detailed Feedback</label>
                  <textarea
                    required
                    placeholder="Tell us what you liked..."
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    rows={6}
                    className="w-full flex-1 min-h-[150px] bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-sm focus:outline-none focus:border-primary transition-colors text-brand-text resize-none"
                  ></textarea>
                </div>

                {reviewFormMessage ? (
                  <p className={`text-[10px] font-black uppercase tracking-widest ${reviewFormMessage.type === 'success' ? 'text-emerald-400' : 'text-accent'}`}>
                    {reviewFormMessage.text}
                  </p>
                ) : null}

                <button
                  type="submit"
                  disabled={isSubmittingReview}
                  className="w-full bg-primary text-black py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-sm disabled:opacity-50 transition-all hover:bg-primary/90 shadow-2xl shadow-primary/20 flex items-center justify-center gap-3"
                >
                  {isSubmittingReview ? 'Submitting...' : 'Submit Review'}
                  <MessageCircle className="w-5 h-5" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {isReviewModalOpen ? (
        <div className="lg:hidden fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm p-3 flex items-end" data-lenis-prevent>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-h-[88vh] overflow-y-auto no-scrollbar bg-[#171717] border border-white/10 rounded-[1.5rem] shadow-2xl"
            data-lenis-prevent
          >
            <div className="px-4 py-4 border-b border-white/10 flex items-center justify-between">
              <h4 className="text-base font-black uppercase tracking-widest text-brand-text">Write Review</h4>
              <button
                type="button"
                onClick={() => setIsReviewModalOpen(false)}
                className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 text-brand-text/70 flex items-center justify-center"
                aria-label="Close review form"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleReviewSubmit} className="p-4 space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-brand-text/40 mb-2 block">Your Name</label>
                <input
                  type="text"
                  required
                  placeholder="Enter identity"
                  value={reviewName}
                  onChange={(e) => setReviewName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors text-brand-text"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-brand-text/40 mb-2 block">Rate Service</label>
                <div className="flex gap-1.5 items-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      className="focus:outline-none hover:scale-110 transition-transform"
                    >
                      <Star className={`w-7 h-7 ${star <= reviewRating ? 'fill-primary text-primary' : 'text-brand-text/20 hover:text-primary/50'}`} />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-brand-text/40 mb-2 block">Detailed Feedback</label>
                <textarea
                  required
                  placeholder="Tell us what you liked..."
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  rows={5}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors text-brand-text resize-none"
                />
              </div>

              {reviewFormMessage ? (
                <p className={`text-[10px] font-black uppercase tracking-widest ${reviewFormMessage.type === 'success' ? 'text-emerald-400' : 'text-accent'}`}>
                  {reviewFormMessage.text}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={isSubmittingReview}
                className="w-full bg-primary text-black py-4 rounded-xl font-black uppercase tracking-[0.2em] text-[11px] disabled:opacity-50 transition-all hover:bg-primary/90 shadow-xl shadow-primary/20 flex items-center justify-center gap-2.5"
              >
                {isSubmittingReview ? 'Submitting...' : 'Submit Review'}
                <MessageCircle className="w-4 h-4" />
              </button>
            </form>
          </motion.div>
        </div>
      ) : null}
    </div>
  );
}
