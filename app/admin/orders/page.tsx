'use client';

import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  MoreVertical,
  Edit3,
  ExternalLink,
  Loader2,
  Zap,
  User,
  ShieldCheck,
  MessageSquare
} from 'lucide-react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import { motion, AnimatePresence } from 'motion/react';

interface Order {
  id: string;
  userId: string;
  userEmail: string;
  serviceName: string;
  planName: string;
  price: number;
  status: string;
  adminNote: string;
  createdAt: any;
  activationDetails?: any;
}

const OrderManagement = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'service_activations'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Order[];
      setOrders(ordersData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    const orderRef = doc(db, 'service_activations', orderId);
    try {
      await updateDoc(orderRef, { status: newStatus });
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Failed to update status.");
    }
  };

  const handleSaveNote = async () => {
    if (!selectedOrder) return;
    setUpdating(true);
    const orderRef = doc(db, 'service_activations', selectedOrder.id);
    try {
      await updateDoc(orderRef, { adminNote: noteText });
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error saving note:", error);
      alert("Failed to save note.");
    } finally {
      setUpdating(false);
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = (order.userEmail?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          order.serviceName?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'All' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) return (
    <div className="h-[60vh] flex flex-col items-center justify-center space-y-4">
      <Loader2 className="w-10 h-10 text-primary animate-spin" />
      <div className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-text/20">Accessing Mainframe...</div>
    </div>
  );

  return (
    <div className="space-y-10">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-brand-text uppercase">Order <span className="internal-gradient">Gateway</span></h1>
          <p className="text-brand-text/40 text-[10px] font-black uppercase tracking-[0.3em] mt-2">Managing {orders.length} Global Activations</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text/20 group-focus-within:text-primary transition-colors" />
            <input 
              type="text" 
              placeholder="Filter by Email/Service..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-6 text-[10px] font-black uppercase tracking-widest focus:outline-none focus:border-primary/50 text-brand-text w-full md:w-64"
            />
          </div>
          
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-5 py-3 text-[10px] font-black uppercase tracking-widest focus:outline-none focus:border-primary/50 text-brand-text appearance-none cursor-pointer"
          >
            <option value="All">All Status</option>
            <option value="Pending">Pending</option>
            <option value="Active">Active</option>
            <option value="Approved">Approved</option>
            <option value="Declined">Declined</option>
          </select>
        </div>
      </div>

      {/* Stats Quick Look */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Pending Queue', value: orders.filter(o => o.status === 'Pending').length, color: 'text-amber-400', bg: 'bg-amber-400/5' },
          { label: 'Active Signals', value: orders.filter(o => o.status === 'Active').length, color: 'text-emerald-400', bg: 'bg-emerald-400/5' },
          { label: 'Total Volume', value: orders.length, color: 'text-primary', bg: 'bg-primary/5' },
          { label: 'Revenue Stream', value: `$${orders.reduce((acc, o) => acc + (Number(o.price) || 0), 0).toFixed(0)}`, color: 'text-purple-400', bg: 'bg-purple-400/5' }
        ].map((stat, i) => (
          <div key={i} className={`p-6 rounded-2xl border border-white/5 ${stat.bg} space-y-2`}>
            <div className={`text-2xl font-black ${stat.color}`}>{stat.value}</div>
            <div className="text-[8px] font-black uppercase tracking-widest text-brand-text/30">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Orders Table */}
      <div className="glass rounded-3xl border border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-white/5">
                <th className="px-8 py-6 text-left text-[9px] font-black uppercase tracking-widest text-brand-text/30">User Identity</th>
                <th className="px-8 py-6 text-left text-[9px] font-black uppercase tracking-widest text-brand-text/30">Service / Plan</th>
                <th className="px-8 py-6 text-left text-[9px] font-black uppercase tracking-widest text-brand-text/30">Status Control</th>
                <th className="px-8 py-6 text-left text-[9px] font-black uppercase tracking-widest text-brand-text/30">Note</th>
                <th className="px-8 py-6 text-right text-[9px] font-black uppercase tracking-widest text-brand-text/30">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center text-brand-text/20 font-black uppercase tracking-widest text-[10px]">
                    No signals matching current frequency.
                  </td>
                </tr>
              ) : filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-white/2 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3">
                       <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-brand-text/30">
                          <User className="w-4 h-4" />
                       </div>
                       <div>
                          <div className="text-[11px] font-black text-brand-text uppercase">{order.userEmail?.split('@')[0]}</div>
                          <div className="text-[8px] font-medium text-brand-text/30 lowercase">{order.userEmail}</div>
                       </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3">
                       <Zap className="w-4 h-4 text-primary" />
                       <div>
                          <div className="text-[11px] font-black text-brand-text uppercase">{order.serviceName}</div>
                          <div className="text-[8px] font-black text-primary/60 uppercase tracking-widest">{order.planName} — ${order.price}</div>
                       </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2">
                      <select 
                        value={order.status}
                        onChange={(e) => handleUpdateStatus(order.id, e.target.value)}
                        className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border focus:outline-none cursor-pointer transition-all ${
                          order.status === 'Active' || order.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                          order.status === 'Declined' ? 'bg-accent/10 text-accent border-accent/20' :
                          'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}
                      >
                        <option value="Pending">Pending</option>
                        <option value="Approved">Approved</option>
                        <option value="Active">Active</option>
                        <option value="Declined">Declined</option>
                      </select>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <button 
                      onClick={() => {
                        setSelectedOrder(order);
                        setNoteText(order.adminNote || '');
                        setIsModalOpen(true);
                      }}
                      className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-brand-text/40 hover:text-primary transition-colors"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      {order.adminNote ? 'Edit Transmission' : 'Add Note'}
                    </button>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <button className="p-2 bg-white/5 rounded-lg border border-white/10 text-brand-text/30 hover:text-primary hover:border-primary/50 transition-all">
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Admin Note Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
             <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
             />
             <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md glass p-10 rounded-[2.5rem] border border-white/5 space-y-8 bg-brand-soft/20 shadow-2xl"
             >
                <div className="text-center">
                   <div className="w-16 h-16 bg-primary/10 rounded-2xl mx-auto mb-6 flex items-center justify-center border border-primary/20">
                      <ShieldCheck className="w-8 h-8 text-primary" />
                   </div>
                   <h2 className="text-2xl font-black uppercase text-brand-text">Admin Directive</h2>
                   <p className="text-brand-text/30 text-[9px] font-black uppercase tracking-widest mt-1">Attaching note to order ref: {selectedOrder?.id.slice(-8).toUpperCase()}</p>
                </div>

                <div className="space-y-4 text-left">
                   <label className="text-[9px] font-black uppercase tracking-widest text-brand-text/40 ml-4">Transmission Content</label>
                   <textarea 
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Enter activation details or instructions..."
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 text-xs font-medium text-brand-text/80 focus:outline-none focus:border-primary/50 min-h-[150px] resize-none"
                   />
                </div>

                <button 
                  onClick={handleSaveNote}
                  disabled={updating}
                  className="w-full bg-primary text-brand-bg py-5 rounded-2xl font-black uppercase tracking-widest border-b-4 border-[#FF8C2A] shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {updating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Edit3 className="w-5 h-5" />}
                  <span>{updating ? 'Syncing...' : 'Seal Directive'}</span>
                </button>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default OrderManagement;
