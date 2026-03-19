'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
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
  ChevronRight
} from 'lucide-react';
import Link from 'next/link';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/firebase';

interface Plan {
  name: string;
  price: number;
  benefits: string[];
}

interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  features?: string[];
  longDescription?: string;
  warranty?: string;
  deliveryStatus?: string;
  accessType?: string;
  plans?: Plan[];
  orderIndex?: number;
}

export default function ServiceDetailClient({ service, loading }: { service: Service | null, loading: boolean }) {
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [couponCode, setCouponCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [couponStatus, setCouponStatus] = useState<'idle' | 'validating' | 'valid' | 'invalid'>('idle');
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (service?.plans && service.plans.length > 0) {
      setSelectedPlan(service.plans[0]);
    } else if (service) {
      setSelectedPlan({
        name: 'Standard Plan',
        price: service.price,
        benefits: service.features || ['Premium Access', 'Instant Delivery']
      });
    }
  }, [service]);

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
    <h2 className="text-3xl font-black uppercase mb-4 tracking-tighter">System Error: Service Missing</h2>
    <Link href="/services" className="px-10 py-4 bg-primary text-black rounded-2xl font-black uppercase tracking-widest text-xs border-b-4 border-secondary transition-all hover:scale-105 active:scale-95">Back to Command Center</Link>
  </div>;

  const currentPrice = selectedPlan ? selectedPlan.price : service.price;
  const totalPrice = (currentPrice * quantity * (1 - discount / 100)).toFixed(2);

  const handleOrder = () => {
    const planName = selectedPlan?.name || 'Standard';
    const message = encodeURIComponent(
      `🚀 NEW ORDER: ${service.name}\n` +
      `--------------------------\n` +
      `📦 Plan: ${planName}\n` +
      `🔢 Quantity: ${quantity}\n` +
      `💰 Unit Price: $${currentPrice}\n` +
      `🏷️ Coupon: ${couponStatus === 'valid' ? couponCode : 'None'}\n` +
      `💎 Access: ${service.accessType || 'Shared'}\n` +
      `--------------------------\n` +
      `💵 TOTAL: $${totalPrice}\n` +
      `--------------------------\n` +
      `Please provide my access credentials now.`
    );
    window.open(`https://wa.me/923209310656?text=${message}`, '_blank');
  };

  return (
    <div className="min-h-screen pt-32 pb-20 px-4 bg-brand-bg relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full -z-10" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-secondary/5 blur-[120px] rounded-full -z-10" />

      <div className="max-w-7xl mx-auto">
        <button onClick={() => router.back()} className="group inline-flex items-center space-x-3 text-brand-text/40 hover:text-primary mb-12 transition-all p-2 rounded-xl hover:bg-white/5">
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="uppercase font-black tracking-[0.2em] text-[10px]">Back to Services</span>
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
                src={service.image}
                alt={service.name}
                fill
                className="object-cover transition-transform duration-1000 group-hover:scale-105"
                referrerPolicy="no-referrer"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute bottom-10 left-10 right-10 flex justify-between items-end">
                <div>
                  <span className="inline-block bg-primary/20 backdrop-blur-md text-primary px-5 py-2 rounded-xl font-black uppercase tracking-widest text-[9px] border border-primary/20 mb-3">
                    {service.category}
                  </span>
                  <p className="text-brand-text/60 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                    <Shield className="w-3 h-3 text-secondary" />
                    {service.warranty || '6 Months Warranty'}
                  </p>
                </div>
                <div className="flex -space-x-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="w-10 h-10 rounded-full border-2 border-brand-bg bg-white/5 overflow-hidden flex items-center justify-center">
                      <UserIcon className="w-5 h-5 opacity-20" />
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Quick Badges */}
            <div className="grid grid-cols-2 gap-3 md:gap-4">
              <div className="glass p-4 md:p-6 rounded-2xl md:rounded-[2rem] border border-white/5 flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-3 md:gap-4 group">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform flex-shrink-0">
                  <Sparkles className="w-5 h-5 md:w-6 md:h-6" />
                </div>
                <div>
                  <div className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-brand-text/30">Delivery</div>
                  <div className="text-[10px] md:text-xs font-black uppercase text-emerald-400 leading-tight">{service.deliveryStatus || 'Instant'}</div>
                </div>
              </div>
              <div className="glass p-4 md:p-6 rounded-2xl md:rounded-[2rem] border border-white/5 flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-3 md:gap-4 group">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-secondary/10 flex items-center justify-center text-secondary group-hover:scale-110 transition-transform flex-shrink-0">
                  <Clock className="w-5 h-5 md:w-6 md:h-6" />
                </div>
                <div>
                  <div className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-brand-text/30">Access</div>
                  <div className="text-[10px] md:text-xs font-black uppercase text-secondary leading-tight">{service.accessType || 'Shared'}</div>
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
                className="text-6xl md:text-8xl font-black mb-6 tracking-tighter text-brand-text uppercase leading-[0.9]"
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
                <h3 className="text-xl font-black uppercase tracking-tighter text-brand-text">Select your plan</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(service.plans && service.plans.length > 0 ? service.plans : [
                  { name: 'Standard Access', price: service.price, benefits: service.features || ['Elite Support', 'Full Warranty', 'Instant Delivery'] },
                  { name: 'Business Pro', price: service.price * 2, benefits: ['All Standard Features', 'Multi-Device Access', 'VIP Response'] }
                ]).map((plan, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedPlan(plan)}
                    className={`relative p-8 rounded-[2.5rem] border text-left transition-all group ${selectedPlan?.name === plan.name
                        ? 'bg-primary/5 border-primary shadow-2xl shadow-primary/10'
                        : 'glass border-white/5 hover:border-white/20'
                      }`}
                  >
                    {selectedPlan?.name === plan.name && (
                      <div className="absolute top-6 right-6 w-6 h-6 bg-primary text-black rounded-full flex items-center justify-center border-2 border-brand-bg scale-110">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                    )}
                    <div className={`text-[9px] font-black uppercase tracking-[0.2em] mb-3 ${selectedPlan?.name === plan.name ? 'text-primary' : 'text-brand-text/40'}`}>
                      {plan.name}
                    </div>
                    <div className="text-3xl font-black text-brand-text mb-6">
                      ${plan.price}
                    </div>
                    <div className="space-y-2">
                      {plan.benefits.map((b, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <CheckCircle2 className={`w-3 h-3 ${selectedPlan?.name === plan.name ? 'text-primary' : 'text-brand-text/20'}`} />
                          <span className="text-[10px] font-bold text-brand-text/60 uppercase tracking-widest">{b}</span>
                        </div>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Modifiers: Quantity & Coupon */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-10 border-y border-white/5">
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-widest text-brand-text/30 ml-2">License Quantity</label>
                <div className="flex items-center bg-white/5 border border-white/10 rounded-2xl p-2 w-fit">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-12 h-12 rounded-xl glass border border-white/5 flex items-center justify-center text-brand-text hover:bg-primary hover:text-black transition-all"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-16 text-center text-xl font-black text-brand-text">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-12 h-12 rounded-xl glass border border-white/5 flex items-center justify-center text-brand-text hover:bg-primary hover:text-black transition-all"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-widest text-brand-text/30 ml-2">Secure Coupon Code</label>
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
                {couponStatus === 'valid' && <p className="text-[10px] text-emerald-400 font-black uppercase tracking-widest ml-4">Success: {discount}% Discount Unlocked!</p>}
                {couponStatus === 'invalid' && <p className="text-[10px] text-accent font-black uppercase tracking-widest ml-4">Error: Tactical Override Failed (Invalid Code)</p>}
              </div>
            </div>

            {/* Checkout Area */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-10">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-text/30 mb-1">Final Transaction Amount</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-6xl font-black text-brand-text tracking-tighter">${totalPrice}</span>
                  {discount > 0 && <span className="text-xl font-black text-accent line-through opacity-40">${(currentPrice * quantity).toFixed(2)}</span>}
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleOrder}
                className="w-full md:w-auto bg-primary text-black px-16 py-6 rounded-[2rem] font-black uppercase tracking-[0.2em] text-sm flex items-center justify-center gap-4 border-b-8 border-secondary shadow-2xl shadow-primary/20 hover:shadow-primary/30 active:border-b-0 active:translate-y-2 transition-all group"
              >
                <span>Order Now</span>
                <MessageCircle className="w-6 h-6 transition-transform group-hover:rotate-12" />
                <ChevronRight className="w-4 h-4 opacity-30" />
              </motion.button>
            </div>

            <div className="p-6 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl flex items-center gap-4">
              <Shield className="w-6 h-6 text-emerald-400" />
              <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest leading-relaxed">
                Secured by Hammad Tools Encryption. All transactions are verified manually via WhatsApp for 100% security and instant deployment.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const UserIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
    <circle cx="12" cy="7" r="4"></circle>
  </svg>
);
