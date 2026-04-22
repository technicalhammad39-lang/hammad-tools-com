'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Users, ShoppingBag, TrendingUp, DollarSign, Package, ExternalLink } from 'lucide-react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { db } from '@/firebase';
import type { EntitlementRecord, OrderRecord } from '@/lib/types/domain';
import { useToast } from '@/components/ToastProvider';
import { useAuth } from '@/context/AuthContext';
import { formatDateTime, getOrderDisplayId, normalizeOrderStatus } from '@/lib/order-system';

interface UserRecord {
  id: string;
  displayName?: string;
  email?: string;
  role?: 'admin' | 'user';
  createdAt?: any;
}

function toDate(value: any) {
  return value?.toDate?.() || (value ? new Date(value) : null);
}

function formatTime(value: any) {
  const date = toDate(value);
  if (!date || Number.isNaN(date.getTime())) {
    return 'N/A';
  }
  return date.toLocaleString();
}

const AdminDashboard = () => {
  const router = useRouter();
  const toast = useToast();
  const { isStaff } = useAuth();
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [entitlements, setEntitlements] = useState<EntitlementRecord[]>([]);
  const [ordersFilter, setOrdersFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  useEffect(() => {
    if (!isStaff) {
      return;
    }
    const unsubOrders = onSnapshot(
      query(collection(db, 'orders'), orderBy('createdAt', 'desc')),
      (snapshot) => {
        setOrders(snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Omit<OrderRecord, 'id'>) })));
      },
      (error) => {
        console.error('Failed to load orders:', error);
        toast.error('Failed to load orders');
      }
    );

    const unsubUsers = onSnapshot(
      query(collection(db, 'users'), orderBy('createdAt', 'desc')),
      (snapshot) => {
        setUsers(snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Omit<UserRecord, 'id'>) })));
      },
      (error) => {
        console.error('Failed to load users:', error);
        toast.error('Failed to load users');
      }
    );

    const unsubEntitlements = onSnapshot(
      query(collection(db, 'entitlements'), orderBy('createdAt', 'desc')),
      (snapshot) => {
        setEntitlements(snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Omit<EntitlementRecord, 'id'>) })));
      },
      (error) => {
        console.error('Failed to load entitlements:', error);
        toast.error('Failed to load entitlements');
      }
    );

    return () => {
      unsubOrders();
      unsubUsers();
      unsubEntitlements();
    };
  }, [toast, isStaff]);

  const totalRevenue = useMemo(() => {
    return orders
      .filter((order) => normalizeOrderStatus(order.status) === 'approved')
      .reduce((sum, order) => sum + Number(order.totalAmount || 0), 0);
  }, [orders]);

  const totalOrders = orders.length;

  const activeUsers = useMemo(() => {
    const activeUserIds = new Set(entitlements.filter((entry) => entry.status === 'active').map((entry) => entry.userId));
    return activeUserIds.size;
  }, [entitlements]);

  const newSignups = useMemo(() => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return users.filter((user) => {
      const createdAt = toDate(user.createdAt);
      return createdAt ? createdAt >= weekAgo : false;
    }).length;
  }, [users]);

  const stats = [
    { label: 'Total Revenue', value: `Rs ${totalRevenue.toFixed(2)}`, icon: DollarSign, tone: 'light' as const },
    { label: 'Total Orders', value: totalOrders.toString(), icon: ShoppingBag, tone: 'warm' as const },
    { label: 'Active Users', value: activeUsers.toString(), icon: Users, tone: 'light' as const },
    { label: 'New Signups', value: newSignups.toString(), icon: TrendingUp, tone: 'warm' as const },
  ];

  const activityFeed = useMemo(() => {
    const events: Array<{ id: string; text: string; time: any; icon: React.ElementType }> = [];

    users.slice(0, 5).forEach((user) => {
      events.push({
        id: `user-${user.id}`,
        text: `${user.displayName || user.email || 'User'} signed up.`,
        time: user.createdAt,
        icon: Users,
      });
    });

    orders.slice(0, 5).forEach((order) => {
      events.push({
        id: `order-${order.id}`,
        text: `${getOrderDisplayId(order)} submitted by ${order.userName || 'customer'}.`,
        time: order.createdAt,
        icon: ShoppingBag,
      });
    });

    entitlements.slice(0, 5).forEach((entitlement) => {
      events.push({
        id: `entitlement-${entitlement.id}`,
        text: `${entitlement.productTitle} activated for ${entitlement.userId}.`,
        time: entitlement.activatedAt || entitlement.createdAt,
        icon: Package,
      });
    });

    return events
      .filter((event) => event.time)
      .sort((a, b) => {
        const aTime = toDate(a.time)?.getTime?.() || 0;
        const bTime = toDate(b.time)?.getTime?.() || 0;
        return bTime - aTime;
      })
      .slice(0, 6);
  }, [orders, users, entitlements]);

  const dashboardOrders = useMemo(() => {
    const statusWeight = (status: string) => {
      const normalized = normalizeOrderStatus(status);
      if (normalized === 'pending') {
        return 0;
      }
      if (normalized === 'approved') {
        return 1;
      }
      return 2;
    };

    return [...orders]
      .filter((order) => ordersFilter === 'all' || normalizeOrderStatus(order.status) === ordersFilter)
      .sort((a, b) => {
        const byStatus = statusWeight(a.status) - statusWeight(b.status);
        if (byStatus !== 0) {
          return byStatus;
        }
        const aTime = toDate(a.createdAt)?.getTime?.() || 0;
        const bTime = toDate(b.createdAt)?.getTime?.() || 0;
        return bTime - aTime;
      })
      .slice(0, 12);
  }, [orders, ordersFilter]);

  if (!isStaff) {
    return <div className="p-10 text-center font-black uppercase tracking-widest">Access Denied</div>;
  }

  return (
    <div className="space-y-6 md:space-y-10">
      <div className="flex md:grid md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-8 overflow-x-auto no-scrollbar -mx-1 px-1 md:mx-0 md:px-0">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`min-w-[210px] md:min-w-0 p-4 md:p-10 rounded-[1.3rem] md:rounded-[2rem] border border-black/10 relative overflow-hidden group transition-all shadow-2xl ${
              stat.tone === 'warm'
                ? 'bg-[#FFF2B3]'
                : 'bg-[#F7F7F7]'
            }`}
          >
            <div className="absolute top-0 right-0 p-3 md:p-4 opacity-[0.08] group-hover:opacity-[0.18] transition-opacity">
              <stat.icon className="w-12 h-12 md:w-16 md:h-16" />
            </div>
            <div className="flex items-center justify-between mb-3 md:mb-8">
              <div
                className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-black/10 text-[#111111] flex items-center justify-center border border-black/20 group-hover:scale-110 transition-transform"
              >
                <stat.icon className="w-5 h-5 md:w-6 md:h-6" />
              </div>
              <span className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-black/60">Live</span>
            </div>
            <div className="text-2xl md:text-4xl font-black mb-1 text-[#111111] break-words">{stat.value}</div>
            <div className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-black/70">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 md:gap-10">
        <div className="xl:col-span-2 glass rounded-[1.6rem] md:rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
          <div className="p-4 md:p-10 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
            <div className="flex items-center gap-3 md:gap-4">
              <div className="w-1.5 h-6 bg-primary rounded-full" />
              <h2 className="text-lg md:text-2xl font-black uppercase text-brand-text">Live Orders</h2>
            </div>
            <span className="hidden md:block text-[10px] font-black uppercase tracking-widest text-brand-text/40">
              Realtime Firestore
            </span>
          </div>

          <div className="px-4 md:px-10 pt-4 md:pt-8 flex gap-2 overflow-x-auto no-scrollbar">
            {[
              { id: 'all', label: 'All' },
              { id: 'pending', label: 'Pending' },
              { id: 'approved', label: 'Approved' },
              { id: 'rejected', label: 'Rejected' },
            ].map((filter) => (
              <button
                key={filter.id}
                onClick={() => setOrdersFilter(filter.id as typeof ordersFilter)}
                className={`px-3.5 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl border text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-colors whitespace-nowrap ${
                  ordersFilter === filter.id
                    ? 'bg-primary text-black border-primary'
                    : 'bg-white/5 border-white/10 text-brand-text/50 hover:text-brand-text'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <div className="p-4 md:p-10 pt-4 md:pt-6">
            <div className="rounded-2xl md:rounded-3xl border border-white/10 overflow-hidden">
              {dashboardOrders.length === 0 ? (
                <div className="h-44 md:h-64 w-full bg-white/5 flex items-center justify-center px-6">
                  <div className="text-center">
                    <ShoppingBag className="w-7 h-7 md:w-8 md:h-8 text-brand-text/20 mx-auto mb-3" />
                    <span className="text-brand-text/35 font-black uppercase tracking-widest text-[10px] md:text-xs">
                      No orders found for this filter.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {dashboardOrders.map((order) => {
                    const firstItem = order.itemSummary?.[0] || order.items?.[0];
                    const orderedItemName =
                      firstItem?.productTitle ||
                      order.primaryItemName ||
                      (order.items || []).map((item) => item.productTitle).filter(Boolean).join(', ') ||
                      'Unknown item';
                    const customerText = order.userName || order.userEmail || order.email || 'Customer';
                    const normalizedStatus = normalizeOrderStatus(order.status);
                    return (
                      <div key={order.id} className="p-3.5 md:p-6 bg-white/[0.02]">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2.5 md:gap-3">
                          <div className="min-w-0">
                            <div className="text-sm md:text-base font-semibold text-brand-text break-words">
                              {orderedItemName}
                            </div>
                            <div className="text-[10px] md:text-[11px] text-brand-text/60 mt-1 break-words">{customerText}</div>
                            <div className="text-[9px] md:text-[10px] text-brand-text/40 mt-1">{formatDateTime(order.createdAt)}</div>
                          </div>

                          <div className="flex items-center gap-2 md:gap-4 flex-wrap">
                            <div className="text-xs md:text-sm font-semibold text-primary">
                              Rs {Number(order.totalAmount || 0).toFixed(2)}
                            </div>
                            <div
                              className={`px-2.5 md:px-3 py-1 rounded-lg border text-[9px] md:text-[10px] font-black uppercase tracking-widest ${
                                normalizedStatus === 'pending'
                                  ? 'text-amber-400 border-amber-400/30 bg-amber-400/10'
                                  : normalizedStatus === 'approved'
                                  ? 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10'
                                  : 'text-accent border-accent/30 bg-accent/10'
                              }`}
                            >
                              {normalizedStatus}
                            </div>
                            <button
                              onClick={() => router.push(`/admin/orders?order=${encodeURIComponent(order.id)}`)}
                              className="px-2.5 md:px-3 py-1.5 md:py-2 rounded-lg border border-primary/30 bg-primary text-black text-[9px] md:text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-1.5"
                            >
                              <ExternalLink className="w-3.5 h-3.5" /> View
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="glass rounded-[1.6rem] md:rounded-[2.5rem] border border-white/5 p-4 md:p-10 shadow-2xl">
          <div className="flex items-center gap-3 md:gap-4 mb-5 md:mb-10">
            <div className="w-1.5 h-6 bg-accent rounded-full" />
            <h2 className="text-lg md:text-2xl font-black uppercase text-brand-text">System Alerts</h2>
          </div>
          <div className="space-y-3 md:space-y-6">
            {activityFeed.length === 0 ? (
              <div className="text-center text-[10px] uppercase tracking-widest font-black text-brand-text/30 py-8 md:py-10">
                No recent activity.
              </div>
            ) : (
              activityFeed.map((alert) => (
                <div key={alert.id} className="flex gap-3 md:gap-4 p-3 md:p-4 rounded-xl md:rounded-2xl hover:bg-white/5 transition-colors group">
                  <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0 border border-white/10 group-hover:border-primary/20">
                    <alert.icon className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-[11px] md:text-xs font-black text-brand-text/80 leading-relaxed">{alert.text}</div>
                    <div className="text-[9px] font-black uppercase tracking-widest text-brand-text/30 mt-1">{formatTime(alert.time)}</div>
                  </div>
                </div>
              ))
            )}
          </div>
          <button className="w-full mt-5 md:mt-10 py-3 md:py-5 rounded-xl md:rounded-2xl bg-white/5 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-brand-text/40 hover:bg-white/10 transition-all border border-white/10">
            View All Activity
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
