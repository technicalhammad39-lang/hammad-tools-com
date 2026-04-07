'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  MessageSquare,
  ShieldCheck,
  Eye,
  Send,
  PackageCheck,
} from 'lucide-react';
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { db, auth } from '@/firebase';
import type { EntitlementRecord, OrderRecord } from '@/lib/types/domain';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ToastProvider';

const STATUS_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'pending_verification', label: 'Pending' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'needs_info', label: 'Needs Info' },
  { id: 'completed', label: 'Completed' },
] as const;

function formatDate(value: any) {
  const date = value?.toDate?.() || (value ? new Date(value) : null);
  if (!date || Number.isNaN(date.getTime())) {
    return 'N/A';
  }
  return date.toLocaleString();
}

function statusStyles(status: string) {
  if (status === 'approved') {
    return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
  }
  if (status === 'rejected') {
    return 'bg-accent/10 text-accent border-accent/20';
  }
  if (status === 'completed') {
    return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
  }
  if (status === 'needs_info') {
    return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
  }
  return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
}

export default function AdminOrdersPage() {
  const { isStaff } = useAuth();
  const toast = useToast();
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [entitlements, setEntitlements] = useState<EntitlementRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]['id']>('all');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [deliveryDetails, setDeliveryDetails] = useState('');
  const [internalNote, setInternalNote] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isStaff) {
      return;
    }

    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Omit<OrderRecord, 'id'>) }));
        setOrders(data);
        setLoading(false);
      },
      (error) => {
        console.error('Failed to load orders:', error);
        toast.error('Failed to load orders', 'Check your Firebase connection.');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [isStaff]);

  useEffect(() => {
    if (!selectedOrderId) {
      setEntitlements([]);
      return;
    }

    const entitlementsQuery = query(collection(db, 'entitlements'), where('orderId', '==', selectedOrderId));
    const unsubscribe = onSnapshot(entitlementsQuery, (snapshot) => {
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
      toast.error('Failed to load entitlements');
    });

    return () => unsubscribe();
  }, [selectedOrderId]);

  const selectedOrder = useMemo(
    () => orders.find((order) => order.id === selectedOrderId) || null,
    [orders, selectedOrderId]
  );

  useEffect(() => {
    if (!selectedOrder) {
      setMessage('');
      setRejectionReason('');
      setDeliveryDetails('');
      setInternalNote('');
      return;
    }

    setMessage(selectedOrder.adminMessage || '');
    setRejectionReason(selectedOrder.rejectionReason || '');
    setDeliveryDetails(selectedOrder.deliveryDetails || '');
    setInternalNote(selectedOrder.internalNote || '');
  }, [selectedOrder]);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const searchable = [
        order.orderNumber,
        order.userEmail,
        order.userName,
        order.paymentProof?.senderNumber,
        order.paymentProof?.transactionId,
        ...(order.items || []).map((item) => item.productTitle),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const matchesSearch = searchable.includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [orders, searchTerm, statusFilter]);

  const stats = useMemo(
    () => ({
      pending: orders.filter((order) => order.status === 'pending_verification').length,
      approved: orders.filter((order) => order.status === 'approved').length,
      rejected: orders.filter((order) => order.status === 'rejected').length,
      completed: orders.filter((order) => order.status === 'completed').length,
    }),
    [orders]
  );

  if (!isStaff) {
    return <div className="p-10 text-center font-black uppercase tracking-widest">Access Denied</div>;
  }

  async function runAction(
    action: 'approve' | 'reject' | 'request_info' | 'send_message' | 'mark_completed' | 'add_internal_note'
  ) {
    if (!selectedOrder) {
      return;
    }

    setError('');
    setActionLoading(true);

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('Missing admin token. Please login again.');
      }

      let token = await currentUser.getIdToken(true);
      let response = await fetch(`/api/orders/${selectedOrder.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action,
          message,
          rejectionReason,
          deliveryDetails,
          internalNote,
        }),
      });

      if (response.status === 401) {
        token = await currentUser.getIdToken(true);
        response = await fetch(`/api/orders/${selectedOrder.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            action,
            message,
            rejectionReason,
            deliveryDetails,
            internalNote,
          }),
        });
      }

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to update order.');
      }
      toast.success('Order updated', `Action ${action.replace('_', ' ')} completed.`);
    } catch (actionError) {
      const message = actionError instanceof Error ? actionError.message : 'Failed to update order.';
      setError(message);
      toast.error('Order update failed', message);
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-brand-text uppercase">Order <span className="internal-gradient">Management</span></h1>
          <p className="text-brand-text/40 text-[10px] font-black uppercase tracking-[0.3em] mt-2">Realtime Verification Workflow</p>
        </div>

        <div className="relative group w-full md:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text/20 group-focus-within:text-primary transition-colors" />
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search order, user, txid..."
            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-[10px] font-black uppercase tracking-widest focus:outline-none focus:border-primary/50"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Pending', value: stats.pending, color: 'text-amber-400', bg: 'bg-amber-400/5' },
          { label: 'Approved', value: stats.approved, color: 'text-emerald-400', bg: 'bg-emerald-400/5' },
          { label: 'Rejected', value: stats.rejected, color: 'text-accent', bg: 'bg-accent/5' },
          { label: 'Completed', value: stats.completed, color: 'text-blue-400', bg: 'bg-blue-400/5' },
        ].map((stat) => (
          <div key={stat.label} className={`p-5 rounded-2xl border border-white/5 ${stat.bg}`}>
            <div className={`text-2xl font-black ${stat.color}`}>{stat.value}</div>
            <div className="text-[9px] font-black uppercase tracking-widest text-brand-text/40 mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((filter) => (
          <button
            key={filter.id}
            onClick={() => setStatusFilter(filter.id)}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border ${statusFilter === filter.id ? 'bg-primary border-primary text-black' : 'bg-white/5 border-white/10 text-brand-text/40'}`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 glass rounded-[2rem] border border-white/5 overflow-hidden">
          {loading ? (
            <div className="py-24 flex justify-center"><Loader2 className="w-10 h-10 text-primary animate-spin" /></div>
          ) : filteredOrders.length === 0 ? (
            <div className="py-24 text-center text-brand-text/30 text-xs uppercase tracking-widest font-black">No orders found.</div>
          ) : (
            <div className="divide-y divide-white/5">
              {filteredOrders.map((order) => (
                <button
                  key={order.id}
                  onClick={() => setSelectedOrderId(order.id)}
                  className={`w-full text-left p-6 hover:bg-white/5 transition-colors ${selectedOrderId === order.id ? 'bg-white/5' : ''}`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="text-sm font-black uppercase text-brand-text">{order.orderNumber || order.id}</div>
                      <div className="text-[9px] font-black uppercase tracking-widest text-brand-text/30 mt-1">
                        {order.userName || 'Customer'} · {order.userEmail || 'No email'}
                      </div>
                      <div className="text-[9px] font-black uppercase tracking-widest text-brand-text/20 mt-2">
                        {(order.items || []).map((item) => item.productTitle).join(', ')}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-black text-primary">Rs {Number(order.totalAmount || 0).toFixed(2)}</div>
                      <div className={`inline-flex mt-2 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border ${statusStyles(order.status)}`}>
                        {order.status.replace('_', ' ')}
                      </div>
                      <div className="text-[9px] font-black uppercase tracking-widest text-brand-text/30 mt-2">{formatDate(order.createdAt)}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="glass rounded-[2rem] border border-white/5 p-6 min-h-[500px]">
          {!selectedOrder ? (
            <div className="h-full grid place-items-center text-center text-brand-text/30 text-xs uppercase tracking-widest font-black">
              Select an order to inspect details.
            </div>
          ) : (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-black uppercase text-brand-text">{selectedOrder.orderNumber || selectedOrder.id}</h2>
                <div className="text-[9px] font-black uppercase tracking-widest text-brand-text/30 mt-1">{selectedOrder.userName} · {selectedOrder.userEmail}</div>
                <div className={`inline-flex mt-3 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border ${statusStyles(selectedOrder.status)}`}>
                  {selectedOrder.status.replace('_', ' ')}
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
                <div className="text-[9px] font-black uppercase tracking-widest text-brand-text/30">Payment Proof</div>
                <div className="text-[10px] font-black uppercase tracking-widest text-brand-text/50">Sender: {selectedOrder.paymentProof?.senderName} · {selectedOrder.paymentProof?.senderNumber}</div>
                <div className="text-[10px] font-black uppercase tracking-widest text-brand-text/50">TXID: {selectedOrder.paymentProof?.transactionId}</div>
                {selectedOrder.paymentProof?.screenshotUrl ? (
                  <div className="space-y-2">
                    <a
                      href={selectedOrder.paymentProof.screenshotUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary"
                    >
                      <Eye className="w-4 h-4" /> View Screenshot
                    </a>
                    <img
                      src={selectedOrder.paymentProof.screenshotUrl}
                      alt="Payment proof"
                      className="w-full max-h-48 object-cover rounded-xl border border-white/10"
                    />
                  </div>
                ) : null}
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
                <div className="text-[9px] font-black uppercase tracking-widest text-brand-text/30">Payment Method</div>
                <div className="text-[10px] font-black uppercase tracking-widest text-brand-text/50">{selectedOrder.paymentMethodSnapshot?.name}</div>
                <div className="text-[10px] font-black uppercase tracking-widest text-brand-text/40">
                  {selectedOrder.paymentMethodSnapshot?.accountTitle} · {selectedOrder.paymentMethodSnapshot?.accountNumber}
                </div>
                {selectedOrder.paymentMethodSnapshot?.instructions ? (
                  <div className="text-[10px] font-black uppercase tracking-widest text-brand-text/40">{selectedOrder.paymentMethodSnapshot.instructions}</div>
                ) : null}
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
                <div className="text-[9px] font-black uppercase tracking-widest text-brand-text/30">Timestamps</div>
                <div className="text-[10px] font-black uppercase tracking-widest text-brand-text/40">Created: {formatDate(selectedOrder.createdAt)}</div>
                <div className="text-[10px] font-black uppercase tracking-widest text-brand-text/40">Updated: {formatDate(selectedOrder.updatedAt)}</div>
                <div className="text-[10px] font-black uppercase tracking-widest text-brand-text/40">Approved: {formatDate(selectedOrder.approvedAt)}</div>
                <div className="text-[10px] font-black uppercase tracking-widest text-brand-text/40">Completed: {formatDate(selectedOrder.completedAt)}</div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
                <div className="text-[9px] font-black uppercase tracking-widest text-brand-text/30">Items</div>
                {(selectedOrder.items || []).map((item, index) => (
                  <div key={`${item.productId}-${index}`} className="text-[10px] font-black uppercase tracking-widest text-brand-text/50">
                    {item.productTitle} · {item.selectedPlanName || 'Standard'} · Qty {item.quantity}
                  </div>
                ))}
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
                <div className="text-[9px] font-black uppercase tracking-widest text-brand-text/30">Access Entitlements</div>
                {entitlements.length === 0 ? (
                  <div className="text-[10px] font-black uppercase tracking-widest text-brand-text/30">No entitlement record yet.</div>
                ) : (
                  entitlements.map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between gap-3">
                      <div className="text-[10px] font-black uppercase tracking-widest text-brand-text/50">
                        {entry.productTitle} · {entry.planName || 'Standard'}
                      </div>
                      <div className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border ${statusStyles(entry.status)}`}>
                        {entry.status}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Admin message to buyer"
                className="w-full h-20 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-primary resize-none"
              />

              <textarea
                value={deliveryDetails}
                onChange={(event) => setDeliveryDetails(event.target.value)}
                placeholder="Delivery / subscription details"
                className="w-full h-20 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-primary resize-none"
              />

              <textarea
                value={rejectionReason}
                onChange={(event) => setRejectionReason(event.target.value)}
                placeholder="Rejection reason (required for reject)"
                className="w-full h-16 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-primary resize-none"
              />

              <textarea
                value={internalNote}
                onChange={(event) => setInternalNote(event.target.value)}
                placeholder="Internal note"
                className="w-full h-16 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-primary resize-none"
              />

              {error ? (
                <div className="text-[10px] font-black uppercase tracking-widest text-accent bg-accent/10 border border-accent/20 rounded-xl px-4 py-3">{error}</div>
              ) : null}

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => runAction('approve')}
                  disabled={actionLoading}
                  className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded-xl py-3 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Approve
                </button>
                <button
                  onClick={() => runAction('reject')}
                  disabled={actionLoading}
                  className="bg-accent/15 text-accent border border-accent/30 rounded-xl py-3 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
                >
                  <XCircle className="w-4 h-4" /> Reject
                </button>
                <button
                  onClick={() => runAction('request_info')}
                  disabled={actionLoading}
                  className="bg-purple-500/15 text-purple-400 border border-purple-500/30 rounded-xl py-3 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
                >
                  <Clock className="w-4 h-4" /> Request Info
                </button>
                <button
                  onClick={() => runAction('send_message')}
                  disabled={actionLoading}
                  className="bg-white/10 text-brand-text border border-white/20 rounded-xl py-3 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" /> Message
                </button>
                <button
                  onClick={() => runAction('mark_completed')}
                  disabled={actionLoading}
                  className="col-span-2 bg-blue-500/15 text-blue-400 border border-blue-500/30 rounded-xl py-3 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
                >
                  <PackageCheck className="w-4 h-4" /> Mark Completed
                </button>
                <button
                  onClick={() => runAction('add_internal_note')}
                  disabled={actionLoading}
                  className="col-span-2 bg-primary/15 text-primary border border-primary/30 rounded-xl py-3 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4" /> Save Internal Note
                </button>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
                <div className="text-[9px] font-black uppercase tracking-widest text-brand-text/30">Status History</div>
                <div className="max-h-40 overflow-y-auto space-y-3">
                  {(selectedOrder.statusHistory || []).length === 0 ? (
                    <div className="text-[10px] font-black uppercase tracking-widest text-brand-text/20">No history available.</div>
                  ) : (
                    (selectedOrder.statusHistory || []).map((entry, index) => (
                      <div key={`${entry.status}-${index}`} className="text-[10px] font-black uppercase tracking-widest text-brand-text/50">
                        <span className="text-primary">{entry.status}</span> · {entry.message}
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
                <div className="text-[9px] font-black uppercase tracking-widest text-brand-text/30">Messages</div>
                <div className="max-h-40 overflow-y-auto space-y-2">
                  {(selectedOrder.messages || []).length === 0 ? (
                    <div className="text-[10px] font-black uppercase tracking-widest text-brand-text/20">No messages yet.</div>
                  ) : (
                    (selectedOrder.messages || []).map((entry, index) => (
                      <div key={`${entry.senderId}-${index}`} className="text-[10px] font-black uppercase tracking-widest text-brand-text/50">
                        <MessageSquare className="w-3 h-3 inline mr-1 text-primary" /> {entry.senderRole}: {entry.message}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

