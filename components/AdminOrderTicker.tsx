'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { BellRing, ExternalLink, X } from 'lucide-react';
import { collection, doc, onSnapshot, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { db } from '@/firebase';
import { useAuth } from '@/context/AuthContext';
import type { OrderRecord } from '@/lib/types/domain';
import { formatDateTime, getOrderDisplayId } from '@/lib/order-system';
import { useToast } from '@/components/ToastProvider';

export default function AdminOrderTicker() {
  const { isStaff, user } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);

  useEffect(() => {
    if (!isStaff) {
      return;
    }

    const q = query(collection(db, 'orders'), where('tickerState', '==', 'new'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs
          .map((snap) => ({ id: snap.id, ...(snap.data() as Omit<OrderRecord, 'id'>) }))
          .sort((a, b) => {
            const aTime = a.createdAt?.toDate?.()?.getTime?.() || 0;
            const bTime = b.createdAt?.toDate?.()?.getTime?.() || 0;
            return aTime - bTime;
          });

        setOrders(docs);
      },
      (error) => {
        console.error('Failed to load new order ticker:', error);
      }
    );

    return () => unsubscribe();
  }, [isStaff]);

  useEffect(() => {
    if (orders.length <= 1) {
      return;
    }

    const timer = window.setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % orders.length);
    }, 4200);

    return () => window.clearInterval(timer);
  }, [orders.length]);

  const safeIndex = useMemo(() => {
    if (!orders.length) {
      return 0;
    }
    return currentIndex % orders.length;
  }, [currentIndex, orders.length]);

  const activeOrder = orders[safeIndex];

  if (!isStaff || !activeOrder) {
    return null;
  }

  async function markTickerState(orderDocId: string, nextState: 'opened' | 'dismissed') {
    setBusyOrderId(orderDocId);
    try {
      await updateDoc(doc(db, 'orders', orderDocId), {
        tickerState: nextState,
        updatedAt: serverTimestamp(),
        updated_at: serverTimestamp(),
        ...(nextState === 'opened'
          ? {
              tickerOpenedAt: serverTimestamp(),
              openedByAdminId: user?.uid || null,
            }
          : {
              tickerDismissedAt: serverTimestamp(),
            }),
      });
    } catch (error) {
      console.error('Failed to update ticker state:', error);
      toast.error('Failed to update new order banner');
    } finally {
      setBusyOrderId(null);
    }
  }

  const displayId = getOrderDisplayId(activeOrder);

  return (
    <div className="border-b border-primary/20 bg-gradient-to-r from-[#171100] via-[#1A1A1A] to-[#171100] px-4 lg:px-10 py-3">
      <AnimatePresence mode="wait">
        <motion.div
          key={activeOrder.id}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -14 }}
          transition={{ duration: 0.24 }}
          className="flex flex-col md:flex-row md:items-center md:justify-between gap-3"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/40 text-primary grid place-items-center mt-0.5">
              <BellRing className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-black uppercase tracking-widest text-primary">
                New Order Arrived ({safeIndex + 1}/{orders.length})
              </div>
              <div className="text-sm font-black uppercase text-brand-text mt-0.5">
                {displayId} - {activeOrder.userEmail || activeOrder.email || 'No email'}
              </div>
              <div className="text-[10px] font-black uppercase tracking-widest text-brand-text/50 mt-1">
                {formatDateTime(activeOrder.createdAt)} - Rs {Number(activeOrder.totalAmount || 0).toFixed(2)}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={async () => {
                await markTickerState(activeOrder.id, 'opened');
                router.push(`/admin/orders?order=${encodeURIComponent(activeOrder.id)}`);
              }}
              disabled={busyOrderId === activeOrder.id}
              className="px-4 py-2 rounded-xl bg-primary text-black text-[10px] font-black uppercase tracking-widest border-b-2 border-secondary inline-flex items-center gap-1.5 disabled:opacity-60"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Open
            </button>

            <button
              onClick={() => {
                void markTickerState(activeOrder.id, 'dismissed');
              }}
              disabled={busyOrderId === activeOrder.id}
              className="px-4 py-2 rounded-xl bg-white/5 border border-white/15 text-brand-text/60 text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-1.5 hover:text-brand-text disabled:opacity-60"
            >
              <X className="w-3.5 h-3.5" /> Dismiss
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
