'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/firebase';
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy, 
  onSnapshot 
} from 'firebase/firestore';
import { 
  Plus, 
  Trash2, 
  Ticket, 
  Calendar, 
  CheckCircle2, 
  XCircle,
  AlertCircle
} from 'lucide-react';
import Link from 'next/link';

interface Coupon {
  id: string;
  code: string;
  discountPercentage: number;
  active: boolean;
  expiryDate?: string;
}

const AdminCoupons = () => {
  const { isAdmin } = useAuth();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newCoupon, setNewCoupon] = useState({
    code: '',
    discountPercentage: 10,
    active: true,
    expiryDate: ''
  });

  useEffect(() => {
    if (!isAdmin) return;

    const q = query(collection(db, 'coupons'), orderBy('code'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Coupon[];
      setCoupons(data);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching coupons:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isAdmin]);

  const handleAdd = async () => {
    if (!newCoupon.code.trim()) return;
    try {
      await addDoc(collection(db, 'coupons'), {
        ...newCoupon,
        code: newCoupon.code.toUpperCase().trim(),
        createdAt: new Date().toISOString()
      });
      setIsAdding(false);
      setNewCoupon({ code: '', discountPercentage: 10, active: true, expiryDate: '' });
    } catch (error) {
      console.error('Error adding coupon:', error);
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'coupons', id), { active: !currentStatus });
    } catch (error) {
      console.error('Error toggling coupon:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this coupon code permanently?')) return;
    try {
      await deleteDoc(doc(db, 'coupons', id));
    } catch (error) {
      console.error('Error deleting coupon:', error);
    }
  };

  if (!isAdmin) {
    return (
      <div className="pt-32 pb-24 text-center">
        <h1 className="text-3xl font-bold uppercase tracking-tighter text-brand-text">Access Blocked</h1>
        <p className="mt-4 text-brand-text/40">Encryption key required for this sector.</p>
        <Link href="/" className="text-primary mt-8 inline-block font-black uppercase tracking-widest text-xs">Return to Surface</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="flex justify-between items-center mb-12">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter text-brand-text">Tactical <span className="internal-gradient">Coupons</span></h1>
          <p className="text-brand-text/40 font-medium mt-2">Manage discount codes and promotional overrides.</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="bg-primary hover:bg-primary/90 text-black px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center space-x-3 transition-all border-b-4 border-secondary shadow-xl shadow-primary/10"
        >
          <Plus className="w-4 h-4" />
          <span>Generate Code</span>
        </button>
      </div>

      {isAdding && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-3xl p-8 mb-12 border border-primary/20 bg-brand-soft/20"
        >
          <h2 className="text-xl font-black mb-6 uppercase tracking-tighter text-brand-text">New Coupon Configuration</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="space-y-2">
               <label className="text-[10px] font-black uppercase tracking-widest text-brand-text/40 ml-2">Coupon Code</label>
               <input 
                  type="text" 
                  placeholder="EX: SAVE50"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-primary text-sm font-black tracking-widest"
                  value={newCoupon.code}
                  onChange={e => setNewCoupon({...newCoupon, code: e.target.value})}
                />
            </div>
            <div className="space-y-2">
               <label className="text-[10px] font-black uppercase tracking-widest text-brand-text/40 ml-2">Discount %</label>
               <input 
                  type="number" 
                  placeholder="10"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-primary text-sm font-black tracking-widest"
                  value={newCoupon.discountPercentage}
                  onChange={e => setNewCoupon({...newCoupon, discountPercentage: Number(e.target.value)})}
                />
            </div>
            <div className="space-y-2">
               <label className="text-[10px] font-black uppercase tracking-widest text-brand-text/40 ml-2">Expiry (Optional)</label>
               <input 
                  type="date" 
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-primary text-sm font-black tracking-widest"
                  value={newCoupon.expiryDate}
                  onChange={e => setNewCoupon({...newCoupon, expiryDate: e.target.value})}
                />
            </div>
            <div className="flex items-end pb-1 ml-4 gap-3">
               <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="w-5 h-5 rounded-md border-white/10 bg-white/5 text-primary focus:ring-primary"
                    checked={newCoupon.active}
                    onChange={e => setNewCoupon({...newCoupon, active: e.target.checked})}
                  />
                  <span className="text-[10px] font-black uppercase tracking-widest text-brand-text">Active Now</span>
               </label>
            </div>
          </div>
          <div className="flex justify-end space-x-4">
            <button onClick={() => setIsAdding(false)} className="px-6 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] text-brand-text/40 hover:text-brand-text transition-colors">Abort</button>
            <button onClick={handleAdd} className="bg-primary px-10 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] text-black border-b-4 border-secondary shadow-lg shadow-primary/10">Deploy Coupon</button>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-20 flex justify-center"><div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
        ) : coupons.length === 0 ? (
          <div className="col-span-full py-20 glass rounded-[2rem] border-white/5 text-center flex flex-col items-center">
             <AlertCircle className="w-12 h-12 text-brand-text/10 mb-4" />
             <p className="text-brand-text/40 font-black uppercase tracking-widest text-xs">No active coupons detected in the system.</p>
          </div>
        ) : coupons.map(coupon => (
          <div key={coupon.id} className="glass rounded-[2rem] p-8 border border-white/5 relative group bg-brand-soft/10">
            <div className="flex justify-between items-start mb-6">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                <Ticket className="w-6 h-6" />
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => handleToggleActive(coupon.id, coupon.active)}
                  className={`p-2.5 rounded-xl border transition-all ${coupon.active ? 'bg-emerald-400/10 border-emerald-400/20 text-emerald-400' : 'bg-brand-text/5 border-brand-text/10 text-brand-text/20'}`}
                >
                  {coupon.active ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                </button>
                <button 
                  onClick={() => handleDelete(coupon.id)}
                  className="p-2.5 bg-accent/10 hover:bg-accent/20 border border-accent/20 rounded-xl text-accent transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-2xl font-black text-brand-text tracking-widest leading-none">{coupon.code}</h3>
              <div className="flex items-center gap-2">
                 <span className="text-3xl font-black text-primary">{coupon.discountPercentage}%</span>
                 <span className="text-[10px] font-black uppercase tracking-widest text-brand-text/40">OFF TOTAL</span>
              </div>
              {coupon.expiryDate && (
                <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-brand-text/30 bg-white/5 py-2 px-3 rounded-lg w-fit">
                   <Calendar className="w-3 h-3" />
                   EXPIRES: {coupon.expiryDate}
                </div>
              )}
            </div>

            <div className="absolute transition-opacity inset-0 border-2 border-primary/0 group-hover:border-primary/10 rounded-[2rem] pointer-events-none" />
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminCoupons;
