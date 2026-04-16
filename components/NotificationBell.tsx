'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/firebase';
import {
  collection,
  doc,
  limit,
  onSnapshot,
  query,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import type { NotificationRecord } from '@/lib/types/domain';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ToastProvider';

interface NotificationBellProps {
  className?: string;
  maxItems?: number;
  buttonClassName?: string;
  iconClassName?: string;
  badgeClassName?: string;
}

export default function NotificationBell({
  className = '',
  maxItems = 20,
  buttonClassName,
  iconClassName,
  badgeClassName,
}: NotificationBellProps) {
  const { user } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!user) {
      return;
    }

    const q = query(
      collection(db, 'notifications'),
      where('recipientId', '==', user.uid),
      limit(maxItems)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs
        .map((snap) => ({ id: snap.id, ...(snap.data() as Omit<NotificationRecord, 'id'>) }))
        .sort((a, b) => {
          const aTime = a.createdAt?.toDate?.()?.getTime?.() || 0;
          const bTime = b.createdAt?.toDate?.()?.getTime?.() || 0;
          return bTime - aTime;
        });
      setNotifications(docs);
    }, (error) => {
      console.error('Failed to load notifications:', error);
    });

    return () => unsubscribe();
  }, [user, maxItems]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!containerRef.current) {
        return;
      }

      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.read).length,
    [notifications]
  );

  if (!user) {
    return null;
  }

  async function markSingleRead(notificationId: string) {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), {
        read: true,
        updatedAt: new Date(),
      });
    } catch (error) {
      console.error('Failed to mark notification read:', error);
      toast.error('Failed to update notification');
    }
  }

  async function markAllRead() {
    const unread = notifications.filter((notification) => !notification.read);
    if (!unread.length) {
      return;
    }

    const batch = writeBatch(db);
    unread.forEach((notification) => {
      batch.update(doc(db, 'notifications', notification.id), {
        read: true,
        updatedAt: new Date(),
      });
    });
    try {
      await batch.commit();
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Failed to mark all notifications:', error);
      toast.error('Failed to update notifications');
    }
  }

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        className={
          buttonClassName
            ? `relative text-brand-text/40 hover:text-primary transition-all ${buttonClassName}`
            : 'relative p-2 rounded-xl bg-white/5 border border-white/10 text-brand-text/40 hover:text-primary hover:border-primary/30 transition-all'
        }
        aria-label="Open notifications"
      >
        <Bell className={iconClassName || 'w-5 h-5'} />
        {unreadCount > 0 ? (
          <span
            className={`absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-primary text-black text-[10px] font-black grid place-items-center border border-secondary ${
              badgeClassName || ''
            }`}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 mt-3 w-[340px] max-w-[90vw] bg-[#0A0A0A]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[130]">
          <div className="p-4 border-b border-white/5 flex items-center justify-between">
            <div className="text-[10px] font-black uppercase tracking-widest text-brand-text/50">Notifications</div>
            <button
              onClick={markAllRead}
              className="text-[9px] font-black uppercase tracking-widest text-primary flex items-center gap-1"
            >
              <CheckCheck className="w-3.5 h-3.5" /> Mark all read
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto divide-y divide-white/5">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-[10px] font-black uppercase tracking-widest text-brand-text/20">
                No notifications yet.
              </div>
            ) : (
              notifications.map((notification) => (
                <button
                  key={notification.id}
                  onClick={async () => {
                    await markSingleRead(notification.id);
                    setOpen(false);
                    if (notification.link) {
                      router.push(notification.link);
                    }
                  }}
                  className="w-full text-left p-4 hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-black uppercase text-brand-text">{notification.title}</div>
                      <div className="text-[10px] text-brand-text/50 font-black uppercase tracking-widest mt-1 leading-relaxed">
                        {notification.body}
                      </div>
                    </div>
                    {!notification.read ? <span className="w-2 h-2 rounded-full bg-primary mt-1.5" /> : null}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

