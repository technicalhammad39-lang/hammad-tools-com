'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Users, ShoppingBag, TrendingUp, DollarSign, Package, Activity } from 'lucide-react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '@/firebase';
import type { EntitlementRecord, OrderRecord } from '@/lib/types/domain';
import { useToast } from '@/components/ToastProvider';
import { useAuth } from '@/context/AuthContext';

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
  const toast = useToast();
  const { isStaff } = useAuth();
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [entitlements, setEntitlements] = useState<EntitlementRecord[]>([]);

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
      .filter((order) => ['approved', 'completed'].includes(order.status))
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
    { label: 'Total Revenue', value: `Rs ${totalRevenue.toFixed(2)}`, icon: DollarSign },
    { label: 'Total Orders', value: totalOrders.toString(), icon: ShoppingBag },
    { label: 'Active Users', value: activeUsers.toString(), icon: Users },
    { label: 'New Signups', value: newSignups.toString(), icon: TrendingUp },
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
        text: `${order.orderNumber || 'Order'} submitted by ${order.userName || 'customer'}.`,
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

  if (!isStaff) {
    return <div className="p-10 text-center font-black uppercase tracking-widest">Access Denied</div>;
  }

  return (
    <div className="space-y-10">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass p-10 rounded-[2rem] border border-white/5 relative overflow-hidden group hover:border-primary/20 transition-all"
          >
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-20 transition-opacity">
              <stat.icon className="w-16 h-16" />
            </div>
            <div className="flex items-center justify-between mb-8">
              <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-primary border border-primary/10 group-hover:scale-110 transition-transform">
                <stat.icon className="w-6 h-6" />
              </div>
              <span className="text-[9px] font-black uppercase tracking-widest text-brand-text/40">Live</span>
            </div>
            <div className="text-4xl font-black mb-1 text-brand-text">{stat.value}</div>
            <div className="text-[10px] font-black uppercase tracking-widest text-brand-text/30">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
        <div className="xl:col-span-2 glass rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
          <div className="p-10 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
            <div className="flex items-center gap-4">
              <div className="w-1.5 h-6 bg-primary rounded-full" />
              <h2 className="text-2xl font-black uppercase text-brand-text">Platform Overview</h2>
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-brand-text/40">Realtime Firestore</span>
          </div>
          <div className="p-10">
            <div className="h-80 w-full bg-white/5 rounded-3xl border border-dashed border-white/10 flex items-center justify-center">
              <span className="text-brand-text/30 font-black uppercase tracking-widest text-xs italic">Analytics module not configured.</span>
            </div>
          </div>
        </div>

        <div className="glass rounded-[2.5rem] border border-white/5 p-10 shadow-2xl">
          <div className="flex items-center gap-4 mb-10">
            <div className="w-1.5 h-6 bg-accent rounded-full" />
            <h2 className="text-2xl font-black uppercase text-brand-text">System Alerts</h2>
          </div>
          <div className="space-y-6">
            {activityFeed.length === 0 ? (
              <div className="text-center text-[10px] uppercase tracking-widest font-black text-brand-text/30 py-10">
                No recent activity.
              </div>
            ) : (
              activityFeed.map((alert) => (
                <div key={alert.id} className="flex gap-4 p-4 rounded-2xl hover:bg-white/5 transition-colors group">
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0 border border-white/10 group-hover:border-primary/20">
                    <alert.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-xs font-black text-brand-text/80 leading-relaxed">{alert.text}</div>
                    <div className="text-[9px] font-black uppercase tracking-widest text-brand-text/30 mt-1">{formatTime(alert.time)}</div>
                  </div>
                </div>
              ))
            )}
          </div>
          <button className="w-full mt-10 py-5 rounded-2xl bg-white/5 text-[10px] font-black uppercase tracking-widest text-brand-text/40 hover:bg-white/10 transition-all border border-white/10">
            View All Activity
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
