'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard,
  ShoppingBag,
  Bell,
  Settings,
  LogOut,
  Zap,
  Clock,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  PackageCheck,
  Copy,
} from 'lucide-react';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import type { EntitlementRecord, NotificationRecord, OrderRecord } from '@/lib/types/domain';
import { useToast } from '@/components/ToastProvider';

function formatDate(value: any) {
  const date = value?.toDate?.() || (value ? new Date(value) : null);
  if (!date || Number.isNaN(date.getTime())) {
    return 'N/A';
  }
  return date.toLocaleString();
}

function statusClass(status: string) {
  if (status === 'approved' || status === 'active') {
    return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
  }
  if (status === 'pending_verification' || status === 'needs_info' || status === 'pending') {
    return 'bg-amber-500/10 border-amber-500/20 text-amber-400';
  }
  if (status === 'rejected') {
    return 'bg-accent/10 border-accent/20 text-accent';
  }
  if (status === 'expired') {
    return 'bg-orange-500/10 border-orange-500/20 text-orange-400';
  }
  if (status === 'completed') {
    return 'bg-blue-500/10 border-blue-500/20 text-blue-400';
  }
  return 'bg-white/10 border-white/20 text-brand-text/60';
}

function CountdownTimer({ expiresAt }: { expiresAt: any }) {
  const [remaining, setRemaining] = useState('');

  useEffect(() => {
    const targetDate = expiresAt?.toDate?.() || (expiresAt ? new Date(expiresAt) : null);
    if (!targetDate) {
      setRemaining('Lifetime');
      return;
    }

    const interval = setInterval(() => {
      const now = Date.now();
      const delta = targetDate.getTime() - now;
      if (delta <= 0) {
        setRemaining('Expired');
        clearInterval(interval);
        return;
      }

      const days = Math.floor(delta / (1000 * 60 * 60 * 24));
      const hours = Math.floor((delta % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((delta % (1000 * 60 * 60)) / (1000 * 60));
      setRemaining(`${days}d ${hours}h ${minutes}m`);
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  return <span className="font-mono text-primary">{remaining || 'Calculating...'}</span>;
}

export default function DashboardPage() {
  const { user, profile, logout, loading: authLoading } = useAuth();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'notifications' | 'settings'>('overview');
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [entitlements, setEntitlements] = useState<EntitlementRecord[]>([]);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!user) {
      return;
    }

    const ordersQuery = query(collection(db, 'orders'), where('userId', '==', user.uid));
    const entitlementQuery = query(collection(db, 'entitlements'), where('userId', '==', user.uid));
    const notificationsQuery = query(collection(db, 'notifications'), where('recipientId', '==', user.uid));

    const unsubOrders = onSnapshot(ordersQuery, (snapshot) => {
      const data = snapshot.docs
        .map((doc) => ({ id: doc.id, ...(doc.data() as Omit<OrderRecord, 'id'>) }))
        .sort((a, b) => {
          const aTime = a.createdAt?.toDate?.()?.getTime?.() || 0;
          const bTime = b.createdAt?.toDate?.()?.getTime?.() || 0;
          return bTime - aTime;
        });
      setOrders(data);
      setLoadingData(false);
    }, (error) => {
      console.error('Failed to load orders:', error);
      setLoadingData(false);
    });

    const unsubEntitlements = onSnapshot(entitlementQuery, (snapshot) => {
      const data = snapshot.docs
        .map((doc) => ({ id: doc.id, ...(doc.data() as Omit<EntitlementRecord, 'id'>) }))
        .sort((a, b) => {
          const aTime = a.createdAt?.toDate?.()?.getTime?.() || 0;
          const bTime = b.createdAt?.toDate?.()?.getTime?.() || 0;
          return bTime - aTime;
        });
      setEntitlements(data);
    }, (error) => {
      console.error('Failed to load entitlements:', error);
    });

    const unsubNotifications = onSnapshot(notificationsQuery, (snapshot) => {
      const data = snapshot.docs
        .map((doc) => ({ id: doc.id, ...(doc.data() as Omit<NotificationRecord, 'id'>) }))
        .sort((a, b) => {
          const aTime = a.createdAt?.toDate?.()?.getTime?.() || 0;
          const bTime = b.createdAt?.toDate?.()?.getTime?.() || 0;
          return bTime - aTime;
        });
      setNotifications(data);
    }, (error) => {
      console.error('Failed to load notifications:', error);
    });

    return () => {
      unsubOrders();
      unsubEntitlements();
      unsubNotifications();
    };
  }, [user]);

  const activeEntitlements = useMemo(() => entitlements.filter((item) => item.status === 'active'), [entitlements]);
  const expiredEntitlements = useMemo(() => entitlements.filter((item) => item.status === 'expired'), [entitlements]);

  const pendingOrders = useMemo(
    () => orders.filter((order) => order.status === 'pending_verification' || order.status === 'needs_info'),
    [orders]
  );
  const rejectedOrders = useMemo(() => orders.filter((order) => order.status === 'rejected'), [orders]);
  const completedOrders = useMemo(() => orders.filter((order) => order.status === 'completed'), [orders]);

  const unreadNotifications = useMemo(() => notifications.filter((item) => !item.read), [notifications]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <div className="min-h-screen bg-black flex items-center justify-center text-accent font-black uppercase tracking-widest">Please login to access dashboard</div>;
  }

  const sidebarItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'orders', label: 'My Orders', icon: ShoppingBag },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'settings', label: 'Settings', icon: Settings },
  ] as const;

  return (
    <main className="min-h-screen pt-24 pb-32 md:pb-12 px-4 bg-brand-bg">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-10">
        <aside className="lg:w-72 flex-shrink-0 hidden lg:block">
          <div className="glass rounded-[2rem] p-6 border border-white/5 sticky top-28 bg-brand-soft/10 backdrop-blur-3xl overflow-hidden">
            <div className="flex items-center gap-4 mb-10 pb-10 border-b border-white/5">
              <div className="w-12 h-12 rounded-xl overflow-hidden border border-primary/20 relative">
                <Image
                  src={profile?.photoURL || `https://ui-avatars.com/api/?name=${profile?.displayName}`}
                  alt="User"
                  fill
                  className="object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div>
                <div className="font-black text-base truncate text-brand-text uppercase">{profile?.displayName || 'User'}</div>
                <div className="text-[9px] font-black uppercase tracking-widest text-primary/60">Verified Member</div>
              </div>
            </div>

            <nav className="space-y-2">
              {sidebarItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-5 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    activeTab === item.id
                      ? 'bg-primary text-brand-bg shadow-lg shadow-primary/10'
                      : 'text-brand-text/40 hover:bg-white/5 hover:text-brand-text'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.label}</span>
                  {item.id === 'notifications' && unreadNotifications.length > 0 ? (
                    <span className="ml-auto text-[9px] bg-black/30 px-2 py-1 rounded-md">{unreadNotifications.length}</span>
                  ) : null}
                </button>
              ))}

              <button
                onClick={logout}
                className="w-full flex items-center gap-3 px-5 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest text-accent/60 hover:bg-accent/10 hover:text-accent transition-all"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </nav>
          </div>
        </aside>

        <div className="flex-1 space-y-8">
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div>
                    <h2 className="text-4xl font-black text-brand-text">
                      Welcome, <span className="text-primary">{profile?.displayName?.split(' ')[0] || 'User'}</span>
                    </h2>
                    <p className="text-brand-text/40 text-xs uppercase tracking-[0.2em] font-black mt-2">Realtime access and order lifecycle</p>
                  </div>
                  <Link href="/tools" className="bg-primary text-black px-8 py-4 rounded-xl font-black uppercase tracking-widest text-[10px] border-b-4 border-secondary">
                    Buy More Tools
                  </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Active', value: activeEntitlements.length, icon: Zap },
                    { label: 'Pending', value: pendingOrders.length, icon: Clock },
                    { label: 'Expired', value: expiredEntitlements.length, icon: AlertCircle },
                    { label: 'Completed', value: completedOrders.length, icon: PackageCheck },
                  ].map((stat) => (
                    <div key={stat.label} className="glass p-6 rounded-2xl border border-white/5">
                      <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-primary mb-4">
                        <stat.icon className="w-5 h-5" />
                      </div>
                      <div className="text-3xl font-black text-brand-text">{stat.value}</div>
                      <div className="text-[9px] font-black uppercase tracking-widest text-brand-text/40 mt-1">{stat.label}</div>
                    </div>
                  ))}
                </div>

                <div className="glass rounded-[2rem] border border-white/5 overflow-hidden">
                  <div className="p-6 border-b border-white/5 flex items-center justify-between">
                    <h3 className="text-lg font-black uppercase text-brand-text">Active Mainframe</h3>
                    <button onClick={() => setActiveTab('orders')} className="text-[9px] font-black uppercase tracking-widest text-primary">View all</button>
                  </div>

                  <div className="divide-y divide-white/5">
                    {loadingData ? (
                      <div className="p-10 text-center"><Loader2 className="w-6 h-6 text-primary animate-spin mx-auto" /></div>
                    ) : activeEntitlements.length === 0 ? (
                      <div className="p-10 text-center text-[10px] font-black uppercase tracking-widest text-brand-text/30">No active subscriptions.</div>
                    ) : (
                      activeEntitlements.map((entitlement) => (
                        <div key={entitlement.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div>
                            <div className="text-base font-black uppercase text-brand-text">{entitlement.productTitle}</div>
                            <div className="text-[9px] uppercase tracking-widest text-brand-text/40 font-black mt-1">Activated: {formatDate(entitlement.activatedAt)}</div>
                            <div className="text-[9px] uppercase tracking-widest text-brand-text/40 font-black mt-1">Expires: {entitlement.expiresAt ? formatDate(entitlement.expiresAt) : 'Lifetime'}</div>
                          </div>
                          <div className="text-[10px] font-black uppercase tracking-widest text-brand-text/50">
                            Remaining: <CountdownTimer expiresAt={entitlement.expiresAt} />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'orders' && (
              <motion.div key="orders" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                <h2 className="text-3xl font-black uppercase text-brand-text">My Orders</h2>

                <div className="glass rounded-[2rem] border border-white/5 overflow-hidden">
                  <div className="p-5 border-b border-white/5 flex items-center gap-2 text-brand-text font-black uppercase tracking-widest text-sm">
                    <CheckCircle2 className="w-4 h-4 text-primary" /> Active Access Items
                  </div>
                  <div className="divide-y divide-white/5">
                    {activeEntitlements.length === 0 ? (
                      <div className="p-6 text-[10px] uppercase tracking-widest font-black text-brand-text/30">No active items.</div>
                    ) : activeEntitlements.map((entry) => (
                      <div key={entry.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                          <div className="text-base font-black uppercase text-brand-text">{entry.productTitle}</div>
                          <div className="text-[9px] font-black uppercase tracking-widest text-brand-text/30 mt-1">Plan: {entry.planName || 'Standard'}</div>
                          <div className="text-[9px] font-black uppercase tracking-widest text-brand-text/30 mt-1">Activated: {formatDate(entry.activatedAt)}</div>
                          <div className="text-[9px] font-black uppercase tracking-widest text-brand-text/30 mt-1">Expires: {entry.expiresAt ? formatDate(entry.expiresAt) : 'Lifetime'}</div>
                        </div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-brand-text/50">
                          Remaining: <CountdownTimer expiresAt={entry.expiresAt} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {[{
                  title: 'Completed / Delivered',
                  icon: PackageCheck,
                  data: completedOrders,
                }, {
                  title: 'Pending',
                  icon: Clock,
                  data: pendingOrders,
                }, {
                  title: 'Rejected',
                  icon: XCircle,
                  data: rejectedOrders,
                }].map((section) => (
                  <div key={section.title} className="glass rounded-[2rem] border border-white/5 overflow-hidden">
                    <div className="p-5 border-b border-white/5 flex items-center gap-2 text-brand-text font-black uppercase tracking-widest text-sm">
                      <section.icon className="w-4 h-4 text-primary" /> {section.title}
                    </div>

                    <div className="divide-y divide-white/5">
                      {(section.data as OrderRecord[]).length === 0 ? (
                        <div className="p-6 text-[10px] uppercase tracking-widest font-black text-brand-text/30">No records.</div>
                      ) : (
                        (section.data as OrderRecord[]).map((order) => (
                          <div key={order.id} className="p-6 space-y-3">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                              <div>
                                <div className="text-base font-black uppercase text-brand-text">{order.orderNumber}</div>
                                <div className="text-[9px] font-black uppercase tracking-widest text-brand-text/30 mt-1">
                                  {(order.items || []).map((item) => item.productTitle).join(', ')}
                                </div>
                              </div>
                              <div className={`px-3 py-1.5 rounded-lg border text-[9px] font-black uppercase tracking-widest ${statusClass(order.status)}`}>
                                {order.status.replace('_', ' ')}
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[9px] font-black uppercase tracking-widest text-brand-text/40">
                              <div>Total: Rs {Number(order.totalAmount || 0).toFixed(2)}</div>
                              <div>TXID: {order.paymentProof?.transactionId || 'N/A'}</div>
                              <div>Placed: {formatDate(order.createdAt)}</div>
                            </div>

                            {order.adminMessage ? (
                              <div className="text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">
                                Admin Message: {order.adminMessage}
                              </div>
                            ) : null}

                            {order.deliveryDetails ? (
                              <div className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 border border-primary/20 rounded-xl px-4 py-3 break-all">
                                Delivery Details: {order.deliveryDetails}
                              </div>
                            ) : null}

                            {order.paymentProof?.screenshotUrl ? (
                              <a
                                href={order.paymentProof.screenshotUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-[9px] uppercase tracking-widest font-black text-brand-text/50 hover:text-primary"
                              >
                                <Copy className="w-3.5 h-3.5" /> View Proof Screenshot
                              </a>
                            ) : null}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ))}

                <div className="glass rounded-[2rem] border border-white/5 overflow-hidden">
                  <div className="p-5 border-b border-white/5 flex items-center gap-2 text-brand-text font-black uppercase tracking-widest text-sm">
                    <AlertCircle className="w-4 h-4 text-primary" /> Expired Access
                  </div>
                  <div className="divide-y divide-white/5">
                    {expiredEntitlements.length === 0 ? (
                      <div className="p-6 text-[10px] uppercase tracking-widest font-black text-brand-text/30">No expired items.</div>
                    ) : expiredEntitlements.map((entry) => (
                      <div key={entry.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                          <div className="text-base font-black uppercase text-brand-text">{entry.productTitle}</div>
                          <div className="text-[9px] font-black uppercase tracking-widest text-brand-text/40 mt-1">Expired: {formatDate(entry.expiresAt)}</div>
                        </div>
                        <Link href="/tools" className="px-4 py-2 rounded-lg bg-primary text-black text-[9px] font-black uppercase tracking-widest border-b-4 border-secondary">
                          Renew / Buy Again
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="glass rounded-[2rem] border border-white/5 overflow-hidden">
                  <div className="p-5 border-b border-white/5 flex items-center gap-2 text-brand-text font-black uppercase tracking-widest text-sm">
                    <ShoppingBag className="w-4 h-4 text-primary" /> Order History
                  </div>
                  <div className="divide-y divide-white/5">
                    {orders.length === 0 ? (
                      <div className="p-6 text-[10px] uppercase tracking-widest font-black text-brand-text/30">No orders yet.</div>
                    ) : orders.map((order) => (
                      <div key={order.id} className="p-6 space-y-3">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                          <div>
                            <div className="text-base font-black uppercase text-brand-text">{order.orderNumber}</div>
                            <div className="text-[9px] font-black uppercase tracking-widest text-brand-text/30 mt-1">
                              {(order.items || []).map((item) => item.productTitle).join(', ')}
                            </div>
                          </div>
                          <div className={`px-3 py-1.5 rounded-lg border text-[9px] font-black uppercase tracking-widest ${statusClass(order.status)}`}>
                            {order.status.replace('_', ' ')}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[9px] font-black uppercase tracking-widest text-brand-text/40">
                          <div>Total: Rs {Number(order.totalAmount || 0).toFixed(2)}</div>
                          <div>TXID: {order.paymentProof?.transactionId || 'N/A'}</div>
                          <div>Placed: {formatDate(order.createdAt)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'notifications' && (
              <motion.div key="notifications" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <h2 className="text-3xl font-black uppercase text-brand-text">Notifications</h2>
                <div className="glass rounded-[2rem] border border-white/5 overflow-hidden divide-y divide-white/5">
                  {notifications.length === 0 ? (
                    <div className="p-10 text-center text-[10px] uppercase tracking-widest font-black text-brand-text/30">No notifications.</div>
                  ) : notifications.map((notification) => (
                    <button
                      key={notification.id}
                    onClick={async () => {
                        try {
                          await updateDoc(doc(db, 'notifications', notification.id), {
                            read: true,
                            updatedAt: new Date(),
                          });
                        } catch (error) {
                          console.error('Failed to mark notification read:', error);
                          toast.error('Failed to update notification');
                        }
                      }}
                      className="w-full text-left p-6 hover:bg-white/5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-black uppercase text-brand-text">{notification.title}</div>
                          <div className="text-[10px] uppercase tracking-widest font-black text-brand-text/50 mt-1">{notification.body}</div>
                          <div className="text-[9px] uppercase tracking-widest font-black text-brand-text/30 mt-2">{formatDate(notification.createdAt)}</div>
                        </div>
                        {!notification.read ? <span className="w-2 h-2 rounded-full bg-primary mt-2" /> : null}
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'settings' && (
              <motion.div key="settings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-xl">
                <div className="glass p-8 rounded-[2rem] border border-white/5 space-y-6">
                  <h2 className="text-2xl font-black uppercase text-brand-text">Account</h2>
                  <div className="text-[10px] uppercase tracking-widest font-black text-brand-text/40">Email: {user.email}</div>
                  <div className="text-[10px] uppercase tracking-widest font-black text-brand-text/40">UID: {user.uid}</div>
                  <button
                    onClick={logout}
                    className="w-full bg-accent/10 text-accent border border-accent/20 py-4 rounded-xl font-black uppercase tracking-widest text-[10px]"
                  >
                    Sign Out
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </main>
  );
}

