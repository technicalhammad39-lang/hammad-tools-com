'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import Image from 'next/image';
import {
  Zap,
  Shield,
  Award,
  CheckCircle2,
  ArrowLeft,
  MessageCircle,
  Minus,
  Plus,
  Ticket,
  Clock,
  Sparkles,
  Star,
  User,
  Users
} from 'lucide-react';
import Link from 'next/link';
import { collection, query, where, getDocs, addDoc, serverTimestamp, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '@/firebase';
import { createOrderPublicId } from '@/lib/order-system';

interface Plan {
  planName: string;
  ourPrice: number;
  officialPrice: number;
  benefits: string[];
}

interface Service {
  id: string;
  name: string;
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
  plans?: Plan[];
}

export default function ServiceDetailClient({ service, loading }: { service: Service | null, loading: boolean }) {
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [couponCode, setCouponCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [couponStatus, setCouponStatus] = useState<'idle' | 'validating' | 'valid' | 'invalid'>('idle');
  const [isCopied, setIsCopied] = useState(false);

  // Reviews State
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewName, setReviewName] = useState('');
  const [reviewText, setReviewText] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  useEffect(() => {
    if (!service) return;
    const slug = service.name.toLowerCase().replace(/ /g, '-');
    const q = query(
      collection(db, 'service_reviews'),
      where('serviceSlug', '==', slug),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedReviews = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setReviews(fetchedReviews);
    });
    return () => unsubscribe();
  }, [service]);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewName.trim() || !reviewText.trim() || !service) return;
    setIsSubmittingReview(true);
    
    try {
      const slug = service.name.toLowerCase().replace(/ /g, '-');
      await addDoc(collection(db, 'service_reviews'), {
        serviceSlug: slug,
        userName: reviewName.trim(),
        text: reviewText.trim(),
        rating: reviewRating,
        createdAt: serverTimestamp()
      });
      setReviewName('');
      setReviewText('');
      setReviewRating(5);
    } catch (error) {
      console.error("Error submitting review: ", error);
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

  const handleCouponValidation = async () => {
    if (!couponCode.trim()) return;
    setCouponStatus('validating');

    try {
      const q = query(collection(db, 'coupons'), where('code', '==', couponCode.toUpperCase()), where('active', '==', true));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const couponData = snapshot.docs[0].data();
        setDiscount(couponData.discountPercentage || 0);
        setCouponStatus('valid');
      } else {
        setDiscount(0);
        setCouponStatus('invalid');
      }
    } catch (error) {
      setCouponStatus('invalid');
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-brand-bg"><div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin shadow-2xl shadow-primary/20" /></div>;
  if (!service) return <div className="min-h-screen flex flex-col items-center justify-center text-brand-text bg-brand-bg">
    <Shield className="w-20 h-20 text-accent mb-6 opacity-20" />
    <h2 className="text-3xl font-black uppercase mb-4">System Error: Tool Missing</h2>
    <Link href="/tools" className="px-10 py-4 bg-primary text-black rounded-2xl font-black uppercase tracking-widest text-xs border-b-4 border-secondary transition-all hover:scale-105 active:scale-95">Back to Command Center</Link>
  </div>;

  const currentPrice = selectedPlan ? selectedPlan.ourPrice : service.price;
  const currentOfficialPrice = selectedPlan
    ? (selectedPlan.officialPrice && selectedPlan.officialPrice > currentPrice ? selectedPlan.officialPrice : 0)
    : (Number(service.salePrice || 0) > currentPrice ? Number(service.salePrice) : 0);
  const totalPrice = (currentPrice * quantity * (1 - discount / 100)).toFixed(2);
  const totalOfficialPrice = (currentOfficialPrice * quantity).toFixed(2);
  const savingsPercent = currentOfficialPrice > currentPrice
    ? Math.round(((currentOfficialPrice - currentPrice) / currentOfficialPrice) * 100)
    : 0;

  const handleOrder = () => {
    const planName = selectedPlan?.planName || 'Standard';
    const params = new URLSearchParams({
      productId: service.id,
      quantity: String(quantity),
      plan: planName,
      orderId: createOrderPublicId(),
    });
    router.push(`/checkout?${params.toString()}`);
  };

  return (
    <div className="min-h-screen pt-32 pb-20 px-4 bg-brand-bg relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full -z-10" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-secondary/5 blur-[120px] rounded-full -z-10" />

      <div className="max-w-7xl mx-auto">
        <button 
          onClick={() => router.back()} 
          className="group inline-flex items-center space-x-3 text-brand-text/40 hover:text-primary mb-4 sm:mb-12 transition-all p-1 sm:p-2 rounded-xl hover:bg-white/5"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="uppercase font-black tracking-[0.2em] text-[10px]">Back to Tools</span>
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20">

          {/* Left Column: Visuals & Meta (5 cols) */}
          <div className="lg:col-span-5 space-y-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative aspect-video md:aspect-square rounded-3xl md:rounded-[3.5rem] overflow-hidden border border-white/10 shadow-3xl group max-h-[40vh] md:max-h-none"
            >
              <Image
                src={(service as any).thumbnail || service.image || '/tools-card.png'}
                alt={service.name}
                fill
                className="object-cover transition-transform duration-1000 group-hover:scale-105"
                referrerPolicy="no-referrer"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute bottom-6 left-6 right-6 flex flex-col items-start gap-2">
                <span className="bg-primary/20 backdrop-blur-md text-primary px-4 py-1.5 rounded-lg font-black tracking-widest text-[8px] border border-primary/20 whitespace-pre-wrap break-words">
                  {service.category}
                </span>
                <div className="bg-black/40 backdrop-blur-md text-brand-text/80 px-4 py-1.5 rounded-lg border border-white/5 flex items-center gap-2">
                  <Clock className="w-3 h-3 text-secondary" />
                  <span className="text-[8px] font-black tracking-widest whitespace-pre-wrap break-words">{service.duration || '1 Month'}</span>
                </div>
              </div>
            </motion.div>

            {/* Quick Badges */}
            <div className="grid grid-cols-2 gap-3 md:gap-4">
              <div className="glass p-3 sm:p-5 rounded-2xl md:rounded-3xl border border-white/5 flex flex-row items-center text-left gap-3 md:gap-4 group h-auto">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl border border-emerald-500/20 bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform flex-shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-brand-text/30">Delivery</div>
                  <div className="text-[10px] md:text-xs font-black text-brand-text leading-tight whitespace-pre-wrap break-words">{service.deliveryStatus || 'Instant'}</div>
                </div>
              </div>
              <div className="glass p-3 sm:p-5 rounded-2xl md:rounded-3xl border border-white/5 flex flex-row items-center text-left gap-3 md:gap-4 group h-auto">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl border border-secondary/20 bg-secondary/10 flex items-center justify-center text-secondary group-hover:scale-110 transition-transform flex-shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-brand-text/30">Access</div>
                  <div className="text-[10px] md:text-xs font-black text-brand-text leading-tight whitespace-pre-wrap break-words">{service.accessLabel || service.accessType || 'Shared'}</div>
                </div>
              </div>
              <div className="glass p-3 sm:p-5 rounded-2xl md:rounded-3xl border border-white/5 flex flex-row items-center text-left gap-3 md:gap-4 group h-auto">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl border border-primary/20 bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform flex-shrink-0">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-brand-text/30">Warranty</div>
                  <div className="text-[10px] md:text-xs font-black text-brand-text leading-tight whitespace-pre-wrap break-words">{service.warranty || 'Full'}</div>
                </div>
              </div>
              <div className="glass p-3 sm:p-5 rounded-2xl md:rounded-3xl border border-white/5 flex flex-row items-center text-left gap-3 md:gap-4 group h-auto">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl border border-purple-500/20 bg-purple-500/10 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform flex-shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-brand-text/30">Plan Type</div>
                  <div className="text-[10px] md:text-xs font-black text-brand-text leading-tight whitespace-pre-wrap break-words">{service.planType || 'Individual'}</div>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: Pricing & Purchase (7 cols) */}
          <div className="lg:col-span-7 space-y-10">
            <div>
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-6xl md:text-8xl font-black mb-6 text-brand-text leading-[0.9] whitespace-pre-wrap break-words"
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
              <div className="flex overflow-x-auto gap-4 pb-4 snap-x hide-scrollbar">
                {displayPlans.map((plan: Plan, i: number) => (
                  <button
                    key={i}
                    onClick={() => setSelectedPlan(plan)}
                    className={`snap-center shrink-0 relative px-8 py-4 rounded-2xl border text-center transition-all ${
                      selectedPlan?.planName === plan.planName
                        ? 'bg-green-500 text-black font-black shadow-lg shadow-green-500/30 border-green-500'
                        : 'glass text-brand-text font-bold border-white/5 hover:border-white/20'
                    }`}
                  >
                    <div className="text-xs tracking-widest whitespace-nowrap flex items-center justify-center gap-2">
                       {selectedPlan?.planName === plan.planName && <CheckCircle2 className="w-4 h-4 text-black" />}
                      {plan.planName}
                    </div>
                  </button>
                ))}
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
                    {discount > 0 && <div className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mt-1 bg-emerald-400/5 w-fit px-3 py-1 rounded-md border border-emerald-400/10">Extra {discount}% Tactical Coupon Active</div>}
                  </div>
                </div>
              )}
            </div>

            {/* Modifiers: Quantity & Coupon */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 py-8 border-y border-white/5">
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

              <div className="glass p-5 rounded-2xl md:rounded-3xl border border-white/5 space-y-4">
                <label className="text-[10px] font-black uppercase tracking-widest text-brand-text/30">Secure Coupon Code</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="ENTER CODE"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    className={`w-full bg-white/5 border rounded-2xl px-12 py-5 text-sm font-black tracking-widest focus:outline-none transition-all ${couponStatus === 'valid' ? 'border-emerald-500/50 text-emerald-400' :
                        couponStatus === 'invalid' ? 'border-accent/50 text-accent' :
                          'border-white/10 text-brand-text'
                      }`}
                  />
                  <Ticket className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text/20" />
                  <button
                    onClick={handleCouponValidation}
                    disabled={couponStatus === 'validating'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
                  >
                    {couponStatus === 'validating' ? 'Checking...' : 'Apply'}
                  </button>
                </div>
                {couponStatus === 'valid' && <p className="text-[10px] text-emerald-400 font-black uppercase tracking-widest">Success: {discount}% Discount Unlocked!</p>}
                {couponStatus === 'invalid' && <p className="text-[10px] text-accent font-black uppercase tracking-widest">Error: Tactical Override Failed (Invalid Code)</p>}
              </div>
            </div>

            <div className="pt-4">
               {/* Mobile Sticky CTA */}
               <div className="fixed bottom-0 left-0 w-full z-[60] p-4 bg-brand-bg/95 backdrop-blur-3xl md:relative md:bg-transparent md:p-0 md:mt-8 md:w-auto border-t border-white/5 md:border-0 shadow-[0_-10px_40px_rgba(0,0,0,0.8)] md:shadow-none">
                 <motion.button
                   whileHover={{ scale: 1.02 }}
                   whileTap={{ scale: 0.98 }}
                   onClick={handleOrder}
                   className="w-full bg-primary text-brand-bg px-10 py-5 md:py-6 rounded-2xl md:rounded-[2rem] font-black uppercase tracking-[0.2em] text-[11px] md:text-sm flex items-center justify-center gap-4 border-b-[6px] md:border-b-8 border-[#FF8C2A] shadow-2xl shadow-primary/20 hover:shadow-primary/40 active:border-b-0 active:translate-y-2 transition-all group"
                 >
                   <span>Buy Now (Rs {totalPrice})</span>
                   <MessageCircle className="w-5 h-5 md:w-6 md:h-6 transition-transform group-hover:rotate-12" />
                 </motion.button>
               </div>
            </div>

            <div className="p-6 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl flex items-center gap-4">
              <Shield className="w-6 h-6 text-emerald-400" />
              <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest leading-relaxed">
                Secured checkout with payment proof upload, admin verification, and realtime order tracking in your dashboard.
              </p>
            </div>
          </div>
        </div>

        {/* Customer Reviews Section */}
        <div className="mt-20 pt-20 border-t border-white/5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <Star className="w-8 h-8 text-primary fill-primary" />
                <h3 className="text-3xl font-black uppercase text-brand-text">Customer Reviews</h3>
              </div>

              {reviews.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-10 glass border border-white/5 rounded-[2rem] text-center">
                  <Star className="w-12 h-12 text-brand-text/10 mb-4" />
                  <p className="text-brand-text/40 font-bold uppercase tracking-widest text-sm">No reviews yet.</p>
                  <p className="text-[10px] text-brand-text/20 mt-1 uppercase tracking-widest">Be the first to review!</p>
                </div>
              ) : (
                <div className="space-y-6 max-h-[560px] overflow-y-auto pr-2 no-scrollbar">
                  {reviews.map((review) => (
                    <motion.div 
                      key={review.id}
                      className="glass p-6 rounded-3xl border border-white/5 flex flex-col justify-between hover:border-primary/20 transition-all shadow-xl"
                    >
                      <div>
                        <div className="flex gap-1 mb-4">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className={`w-4 h-4 ${i < review.rating ? 'fill-primary text-primary' : 'text-brand-text/10'}`} />
                          ))}
                        </div>
                        <p className="text-sm md:text-base font-medium text-brand-text/80 leading-relaxed mb-6 italic">
                          &quot;{review.text}&quot;
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
                          <User className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <div className="text-xs font-black tracking-widest text-brand-text whitespace-pre-wrap break-words">{review.userName}</div>
                          <div className="text-[9px] font-black uppercase tracking-widest text-brand-text/30">Verified Customer</div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            <div className="glass p-8 rounded-[2rem] border border-white/5 shadow-2xl h-fit">
              <h4 className="text-2xl font-black uppercase tracking-widest text-brand-text mb-2 text-center">Share Your Experience</h4>
              <p className="text-center text-brand-text/40 text-xs font-black uppercase tracking-widest mb-8">Help others by leaving a review after purchase</p>
              
              <form onSubmit={handleReviewSubmit} className="space-y-6">
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
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-brand-text/40 mb-2 block">Detailed Feedback</label>
                  <textarea 
                    required
                    placeholder="Tell us what you liked..."
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    rows={4}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-sm focus:outline-none focus:border-primary transition-colors text-brand-text resize-none"
                  ></textarea>
                </div>
                <button 
                  type="submit" 
                  disabled={isSubmittingReview}
                  className="w-full bg-primary text-black py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-sm disabled:opacity-50 transition-all hover:bg-primary/90 shadow-2xl shadow-primary/20 flex items-center justify-center gap-3"
                >
                  {isSubmittingReview ? 'Transmitting Data...' : 'Submit Final Review'}
                  <MessageCircle className="w-5 h-5" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


