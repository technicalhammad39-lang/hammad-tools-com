'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { BellRing, ExternalLink, X } from 'lucide-react';
import { collection, doc, limit, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
import { usePathname, useRouter } from 'next/navigation';
import { db } from '@/firebase';
import { useAuth } from '@/context/AuthContext';
import type { NotificationRecord } from '@/lib/types/domain';
import { formatDateTime } from '@/lib/order-system';
import { useToast } from '@/components/ToastProvider';

const HIDDEN_STORAGE_KEY = 'user_order_ticker_hidden_ids';

function loadHiddenIds() {
  if (typeof window === 'undefined') {
    return new Set<string>();
  }

  try {
    const raw = sessionStorage.getItem(HIDDEN_STORAGE_KEY);
    if (!raw) {
      return new Set<string>();
    }
    const parsed = JSON.parse(raw) as string[];
    return new Set(parsed);
  } catch {
    return new Set<string>();
  }
}

function persistHiddenIds(ids: Set<string>) {
  if (typeof window === 'undefined') {
    return;
  }
  sessionStorage.setItem(HIDDEN_STORAGE_KEY, JSON.stringify(Array.from(ids)));
}

export default function UserOrderTicker() {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(() => loadHiddenIds());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      return;
    }

    const q = query(
      collection(db, 'notifications'),
      where('recipientId', '==', user.uid),
      where('read', '==', false),
      limit(40)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs
          .map((snap) => ({ id: snap.id, ...(snap.data() as Omit<NotificationRecord, 'id'>) }))
          .filter((entry) => entry.type === 'order_message' || entry.type === 'order_status')
          .sort((a, b) => {
            const aTime = a.createdAt?.toDate?.()?.getTime?.() || 0;
            const bTime = b.createdAt?.toDate?.()?.getTime?.() || 0;
            return aTime - bTime;
          });
        setNotifications(docs);
      },
      (error) => {
        console.error('Failed to load user order ticker:', error);
      }
    );

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    persistHiddenIds(hiddenIds);
  }, [hiddenIds]);

  useEffect(() => {
    if (notifications.length <= 1) {
      return;
    }

    const timer = window.setInterval(() => {
      setCurrentIndex((prev) => prev + 1);
    }, 4200);

    return () => window.clearInterval(timer);
  }, [notifications.length]);

  const visibleNotifications = useMemo(
    () => notifications.filter((entry) => !hiddenIds.has(entry.id)),
    [notifications, hiddenIds]
  );

  const safeIndex = useMemo(() => {
    if (!visibleNotifications.length) {
      return 0;
    }
    return currentIndex % visibleNotifications.length;
  }, [currentIndex, visibleNotifications.length]);

  const activeNotification = visibleNotifications[safeIndex] || null;

  if (!user || pathname.startsWith('/admin') || !activeNotification) {
    return null;
  }

  async function openNotification(record: NotificationRecord) {
    setBusyId(record.id);
    try {
      await updateDoc(doc(db, 'notifications', record.id), {
        read: true,
        updatedAt: new Date(),
      });

      const target = record.link || (record.orderId ? `/dashboard?order=${encodeURIComponent(record.orderId)}` : '/dashboard');
      router.push(target);
    } catch (error) {
      console.error('Failed to open notification:', error);
      toast.error('Failed to open order message');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="fixed top-[74px] left-0 right-0 z-[95] px-3 md:px-6">
      <AnimatePresence mode="wait">
        <motion.div
          key={activeNotification.id}
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.2 }}
          className="mx-auto max-w-6xl border border-primary/20 bg-gradient-to-r from-[#141005] via-[#111111] to-[#141005] rounded-xl px-4 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3 shadow-xl"
        >
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-primary/20 border border-primary/35 text-primary grid place-items-center shrink-0">
              <BellRing className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-black uppercase tracking-widest text-primary">Order Update</div>
              <div className="text-sm font-black text-brand-text truncate">{activeNotification.title}</div>
              <div className="text-[10px] font-semibold tracking-wide text-brand-text/55 truncate">
                {activeNotification.body}
              </div>
              <div className="text-[9px] font-black uppercase tracking-widest text-brand-text/30 mt-1">
                {formatDateTime(activeNotification.createdAt)}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                void openNotification(activeNotification);
              }}
              disabled={busyId === activeNotification.id}
              className="px-3 py-2 rounded-lg bg-primary text-black text-[10px] font-black uppercase tracking-widest border-b-2 border-secondary inline-flex items-center gap-1.5 disabled:opacity-60"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Open
            </button>
            <button
              onClick={() => {
                setHiddenIds((prev) => {
                  const next = new Set(prev);
                  next.add(activeNotification.id);
                  return next;
                });
              }}
              className="px-3 py-2 rounded-lg bg-white/5 border border-white/15 text-brand-text/60 text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-1.5 hover:text-brand-text"
            >
              <X className="w-3.5 h-3.5" /> Hide
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
