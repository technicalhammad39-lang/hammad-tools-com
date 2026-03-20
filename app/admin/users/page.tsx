'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/firebase';
import { collection, getDocs, updateDoc, doc, query, orderBy } from 'firebase/firestore';
import { User, Shield, ShieldAlert, Mail, Calendar, Search, Plus, Zap, CheckCircle2, X } from 'lucide-react';
import { serverTimestamp, addDoc } from 'firebase/firestore';

interface UserProfile {
  id: string;
  displayName: string;
  email: string;
  role: 'admin' | 'user';
  createdAt: any;
}

interface Service {
  id: string;
  name: string;
  price: number;
}

const AdminUsers = () => {
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activating, setActivating] = useState(false);
  const [duration, setDuration] = useState(30); // Default 30 days

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
      fetchServices();
    }
  }, [isAdmin]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as UserProfile[];
      setUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchServices = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'services'));
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Service[];
      setServices(data);
    } catch (error) {
      console.error('Error fetching services:', error);
    }
  };

  const activateService = async (service: Service) => {
    if (!selectedUser) return;
    setActivating(true);
    try {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + duration);

      await addDoc(collection(db, 'service_activations'), {
        userId: selectedUser.id,
        userEmail: selectedUser.email,
        serviceName: service.name,
        serviceId: service.id,
        price: service.price,
        status: 'Active',
        paymentStatus: 'Paid',
        type: 'manual_activation',
        durationDays: duration,
        expiryDate: expiryDate,
        createdAt: serverTimestamp(),
      });

      // Also mark in public orders if necessary, but service_activations is primary
      alert(`Successfully activated ${service.name} for ${duration} days!`);
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error activating service:', error);
      alert('Failed to activate service');
    } finally {
      setActivating(false);
    }
  };

  const toggleRole = async (userId: string, currentRole: string) => {
    if (!confirm(`Are you sure you want to change this user's role to ${currentRole === 'admin' ? 'user' : 'admin'}?`)) return;
    try {
      await updateDoc(doc(db, 'users', userId), {
        role: currentRole === 'admin' ? 'user' : 'admin'
      });
      fetchUsers();
    } catch (error) {
      console.error('Error updating user role:', error);
    }
  };

  const filteredUsers = users.filter(u => 
    u.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black uppercase text-brand-text mb-2">User <span className="text-primary">Registry</span></h1>
          <p className="text-brand-text/40 text-xs font-black uppercase tracking-widest">Total Accounts: {users.length}</p>
        </div>
        <div className="relative w-full md:w-96 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-text/20 w-5 h-5 group-focus-within:text-primary transition-colors" />
          <input 
            type="text" 
            placeholder="Search by name or email..."
            className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-6 py-4 text-xs font-black uppercase tracking-widest focus:outline-none focus:border-primary/50 text-brand-text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="glass rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/[0.02]">
                <th className="p-8 text-[10px] font-black uppercase tracking-[0.2em] text-brand-text/40 border-b border-white/5">Identity</th>
                <th className="p-8 text-[10px] font-black uppercase tracking-[0.2em] text-brand-text/40 border-b border-white/5">Access Level</th>
                <th className="p-8 text-[10px] font-black uppercase tracking-[0.2em] text-brand-text/40 border-b border-white/5">Registry Date</th>
                <th className="p-8 text-[10px] font-black uppercase tracking-[0.2em] text-brand-text/40 border-b border-white/5 text-right">Operations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr><td colSpan={4} className="p-20 text-center"><div className="animate-pulse text-primary font-black uppercase tracking-widest text-xs">Accessing Database...</div></td></tr>
              ) : filteredUsers.length === 0 ? (
                <tr><td colSpan={4} className="p-20 text-center text-brand-text/20 font-black uppercase tracking-widest text-xs">No records found</td></tr>
              ) : filteredUsers.map(u => (
                <tr key={u.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="p-8">
                    <div className="flex items-center space-x-5">
                      <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-primary border border-white/10 group-hover:border-primary/30 transition-all">
                        <User className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="font-black text-brand-text uppercase text-sm">{u.displayName || 'Anonymous Entity'}</p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-brand-text/30 mt-1">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-8">
                    <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                      u.role === 'admin' ? 'bg-primary/10 text-primary border-primary/20' : 'bg-white/5 text-brand-text/40 border-white/10'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="p-8 text-xs font-black uppercase text-brand-text/40">
                    {u.createdAt?.toDate ? u.createdAt.toDate().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Unknown'}
                  </td>
                  <td className="p-8 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <button 
                        onClick={() => { setSelectedUser(u); setIsModalOpen(true); }}
                        className="px-4 py-2 rounded-xl bg-primary/10 text-primary hover:bg-primary text-[10px] font-black uppercase tracking-widest transition-all border border-primary/20 hover:text-brand-bg flex items-center gap-2"
                      >
                        <Zap className="w-3.5 h-3.5" /> Activate
                      </button>
                      <button 
                        onClick={() => toggleRole(u.id, u.role)}
                        className={`p-2.5 rounded-xl transition-all border ${
                          u.role === 'admin' ? 'bg-accent/10 text-accent border-accent/20 hover:bg-accent/20' : 'bg-white/5 text-brand-text/40 border-white/10 hover:text-brand-text'
                        }`}
                        title={u.role === 'admin' ? 'Revoke Protocol' : 'Grant Admin'}
                      >
                        {u.role === 'admin' ? <ShieldAlert className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Activation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-xl"
            onClick={() => setIsModalOpen(false)}
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="glass w-full max-w-xl rounded-[2.5rem] border border-white/10 overflow-hidden relative z-10 shadow-3xl"
          >
            <div className="p-10 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black uppercase text-brand-text">Activate <span className="text-primary">Service</span></h2>
                <div className="mt-4 flex items-center space-x-3">
                   <p className="text-[10px] font-black uppercase tracking-widest text-brand-text/40">Duration:</p>
                   <select 
                     value={duration} 
                     onChange={(e) => setDuration(Number(e.target.value))}
                     className="bg-white/5 border border-white/10 rounded-lg px-3 py-1 text-[10px] font-black uppercase tracking-widest text-primary focus:outline-none"
                   >
                     <option value={7}>7 Days</option>
                     <option value={30}>30 Days</option>
                     <option value={90}>90 Days</option>
                     <option value={365}>1 Year</option>
                   </select>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-3 hover:bg-white/5 rounded-2xl text-brand-text/30 hover:text-accent transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-10 space-y-4 max-h-[60vh] overflow-y-auto no-scrollbar">
              {services.length === 0 ? (
                <div className="text-center py-10 text-brand-text/20 font-black uppercase tracking-widest text-xs">No services defined in library</div>
              ) : services.map(service => (
                <button
                  key={service.id}
                  disabled={activating}
                  onClick={() => activateService(service)}
                  className="w-full p-6 rounded-[1.5rem] bg-white/5 border border-white/10 hover:border-primary/50 hover:bg-primary/[0.02] transition-all flex items-center justify-between group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/10 group-hover:scale-110 transition-transform">
                      <Zap className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                       <div className="text-sm font-black text-brand-text uppercase">{service.name}</div>
                       <div className="text-[10px] font-black text-primary uppercase">${service.price} Value</div>
                    </div>
                  </div>
                  <Plus className="w-5 h-5 text-brand-text/20 group-hover:text-primary transition-colors" />
                </button>
              ))}
            </div>
            <div className="p-10 bg-black/40 border-t border-white/5">
               <div className="flex items-center gap-3 text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-[9px] font-black uppercase tracking-[0.2em]">Manual Override enabled</span>
               </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
