'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Gift, 
  Settings, 
  LogOut, 
  User, 
  CreditCard, 
  Download,
  ExternalLink,
  Zap,
  Clock,
  Loader2,
  Mail,
  ArrowRight,
  CheckCircle2,
  Trash2,
  ShieldAlert,
  Save,
  User as UserIcon,
  Shield
} from 'lucide-react';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { collection, query, where, onSnapshot, orderBy, getDoc, doc as fireDoc } from 'firebase/firestore';
import { db } from '@/firebase';

interface Order {
  id: string;
  item: string;
  date: string;
  status: string;
  price: number;
  expiryDate?: any;
}

const CountdownTimer = ({ expiryDate }: { expiryDate: any }) => {
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    if (!expiryDate) return;
    
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const target = expiryDate?.toDate?.()?.getTime?.() || new Date(expiryDate).getTime();
      const distance = target - now;

      if (distance < 0) {
        setTimeLeft('Expired');
        clearInterval(interval);
        return;
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`);
    }, 1000);

    return () => clearInterval(interval);
  }, [expiryDate]);

  return <span className="font-mono text-primary">{timeLeft || 'Calculating...'}</span>;
};

const DashboardPage = () => {
  const { user, profile, logout, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [orders, setOrders] = useState<Order[]>([]);
  const [joinedGiveaways, setJoinedGiveaways] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [formData, setFormData] = useState({
    displayName: profile?.displayName || '',
    email: user?.email || '',
  });

  useEffect(() => {
    if (!user) return;

    // Fetch Orders
    const ordersQ = query(
      collection(db, 'service_activations'), 
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribeOrders = onSnapshot(ordersQ, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        item: doc.data().serviceName,
        date: doc.data().createdAt?.toDate().toLocaleDateString() || 'Recent'
      })) as Order[];
      setOrders(ordersData);
      setLoading(false);
    });

    // Fetch Joined Giveaways
    const giveawayQ = query(
      collection(db, 'user_entries'),
      where('userId', '==', user.uid)
    );

    const unsubscribeGiveaways = onSnapshot(giveawayQ, (snapshot) => {
      setJoinedGiveaways(snapshot.docs.map(doc => doc.data().giveawayId));
    });

    return () => {
      unsubscribeOrders();
      unsubscribeGiveaways();
    };
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    try {
      // Logic for updating profile in AuthContext or Firebase
      alert('Profile update logic placeholder');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteAccount = async () => {
    // Logic for account deletion
    alert('Account deletion logic placeholder');
    setShowDeleteModal(false);
  };

  // authLoading check remains to ensure we have a user context before rendering dashboard structure
  if (authLoading) return <div className="min-h-screen bg-black flex items-center justify-center text-primary font-black uppercase tracking-widest">Loading Dashboard UI...</div>;
  if (!user) return <div className="min-h-screen bg-black flex items-center justify-center text-accent font-black uppercase tracking-widest">Please Login to Access Dashboard</div>;

  const sidebarItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'orders', label: 'My Orders', icon: ShoppingBag },
    { id: 'giveaways', label: 'Giveaways', icon: Gift },
    { id: 'billing', label: 'Billing', icon: CreditCard },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const totalSpent = orders.reduce((acc: number, order: Order) => acc + (Number(order.price) || 0), 0);
  const activeSubs = orders.filter((o: Order) => o.status === 'Active').length;

  const stats = [
    { label: 'Active Subscriptions', value: activeSubs.toString(), icon: Zap, color: 'text-primary' },
    { label: 'Total Spent', value: `$${totalSpent.toFixed(2)}`, icon: CreditCard, color: 'text-purple-500' },
    { label: 'Giveaways Joined', value: joinedGiveaways.length.toString(), icon: Gift, color: 'text-pink-500' },
  ];

  const recentOrders = orders.slice(0, 5);

  return (
    <main className="min-h-screen pt-24 pb-12 px-4 bg-brand-bg">
      {/* Mobile Header (Hidden on Laptop) */}
      <div className="lg:hidden flex items-center justify-between mb-8 pb-6 border-b border-white/5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl border border-primary/20 p-0.5">
            <div className="relative w-full h-full rounded-lg overflow-hidden">
               <Image 
                src={profile?.photoURL || `https://ui-avatars.com/api/?name=${profile?.displayName}`} 
                alt="User" 
                fill
                className="object-cover"
              />
            </div>
          </div>
          <div>
            <div className="text-sm font-black text-brand-text uppercase tracking-tighter">Command Center</div>
            <div className="text-[9px] font-black text-primary uppercase tracking-widest">Operator: {profile?.displayName?.split(' ')[0]}</div>
          </div>
        </div>
        <button onClick={logout} className="p-3 bg-white/5 rounded-xl border border-white/10 text-accent">
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-10">
        
        {/* Sidebar - Desktop Layout */}
        <aside className="lg:w-80 flex-shrink-0 hidden lg:block">
          <div className="glass rounded-[2.5rem] p-8 border border-white/5 sticky top-28 shadow-2xl bg-brand-soft/10 backdrop-blur-3xl overflow-hidden group">
            <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            
            <div className="flex items-center gap-5 mb-10 pb-10 border-b border-white/5 relative z-10">
              <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-primary/20 p-1 relative">
                <div className="relative w-full h-full rounded-xl overflow-hidden">
                  <Image 
                    src={profile?.photoURL || `https://ui-avatars.com/api/?name=${profile?.displayName}`} 
                    alt="User" 
                    fill
                    className="object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>
              <div className="overflow-hidden">
                <div className="font-black text-lg truncate text-brand-text uppercase tracking-tighter leading-none mb-1">{profile?.displayName || 'User'}</div>
                <div className="text-[10px] font-black uppercase tracking-widest text-primary truncate opacity-60 italic">{user?.email}</div>
              </div>
            </div>

            <nav className="space-y-3 relative z-10">
              {sidebarItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-4 px-6 py-5 rounded-[1.25rem] text-xs font-black uppercase tracking-[0.1em] transition-all duration-300 ${
                    activeTab === item.id 
                    ? 'bg-primary text-brand-bg shadow-xl shadow-primary/20 border-b-4 border-[#FF8C2A] translate-x-1' 
                    : 'text-brand-text/40 hover:bg-white/5 hover:text-brand-text hover:translate-x-1'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                  {activeTab === item.id && <Zap className="w-3 h-3 ml-auto opacity-50 fill-current" />}
                </button>
              ))}
              
              <div className="pt-6 mt-6 border-t border-white/5">
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-4 px-6 py-5 rounded-[1.25rem] text-xs font-black uppercase tracking-[0.1em] text-accent/60 hover:bg-accent/10 hover:text-accent transition-all group/logout"
                >
                  <LogOut className="w-5 h-5 group-hover/logout:-translate-x-1 transition-transform" />
                  Log Out System
                </button>
              </div>
            </nav>

            <div className="mt-8 p-6 bg-white/5 rounded-2xl border border-white/10 text-center relative overflow-hidden group/badge">
               <div className="absolute top-0 left-0 w-full h-1 bg-primary/20" />
               <div className="text-[10px] font-black uppercase tracking-widest text-brand-text/40 mb-2">Member Tier</div>
               <div className="text-secondary font-black text-xs uppercase italic tracking-[0.2em]">Alpha Centauri</div>
            </div>
          </div>
        </aside>

        {/* Main Tactical Interface */}
        <div className="flex-1 space-y-10 relative">
          
          {/* Mobile Bottom Navigation (Floating) */}
          <div className="lg:hidden fixed bottom-6 left-4 right-4 z-[100] px-4">
             <div className="glass bg-brand-bg/90 backdrop-blur-3xl rounded-3xl border border-white/10 p-2 flex items-center justify-between shadow-2xl">
                {sidebarItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`flex-1 flex flex-col items-center gap-1.5 py-3 rounded-2xl transition-all ${
                      activeTab === item.id 
                      ? 'bg-primary text-brand-bg shadow-lg shadow-primary/20 border-b-2 border-secondary' 
                      : 'text-brand-text/30'
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="text-[8px] font-black uppercase tracking-widest">{item.label}</span>
                  </button>
                ))}
             </div>
          </div>

          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div 
                key="overview"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-10 pb-32 lg:pb-0"
              >
                {/* Visual Header */}
                <div className="relative p-10 lg:p-14 rounded-[3rem] overflow-hidden border border-white/5 bg-brand-soft/20 group">
                   <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                   <div className="relative z-10">
                      <div className="flex items-center gap-3 mb-6 bg-primary/10 w-fit px-4 py-1.5 rounded-full border border-primary/20">
                         <Zap className="w-4 h-4 text-primary animate-pulse" />
                         <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">System Online</span>
                      </div>
                      <h1 className="text-5xl lg:text-7xl font-black uppercase tracking-tighter text-brand-text mb-4 leading-none transition-transform group-hover:translate-x-2 duration-700">
                         Commander <span className="internal-gradient">{profile?.displayName?.split(' ')[0] || 'Alpha'}</span>
                      </h1>
                      <p className="max-w-xl text-brand-text/40 text-sm font-medium leading-relaxed italic">
                         Authorization verified. Accessing global toolset and subscription mainframe. Ready for tactical execution.
                      </p>
                      
                      <div className="flex gap-4 mt-10">
                         <Link href="/services">
                            <motion.button 
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              className="bg-primary text-black px-10 py-5 rounded-2xl font-black uppercase tracking-widest text-[10px] border-b-4 border-secondary shadow-2xl shadow-primary/20"
                            >
                               Deploy New Intel
                            </motion.button>
                         </Link>
                         <button className="hidden sm:flex bg-white/5 hover:bg-white/10 text-brand-text p-5 rounded-2xl border border-white/10 transition-all items-center gap-3">
                            <Gift className="w-4 h-4 text-secondary" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Rewards Loot</span>
                         </button>
                      </div>
                   </div>
                </div>

                {/* Stats Command Center */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {stats.map((stat, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.1 }}
                      className="glass p-10 rounded-[2.5rem] border border-white/5 relative bg-brand-soft/10 group hover:border-primary/30 transition-all"
                    >
                      <div className="absolute top-6 right-8 text-brand-text/5 rotate-12 group-hover:rotate-0 transition-transform">
                         <stat.icon className="w-16 h-16" />
                      </div>
                      <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-8 border border-white/10 group-hover:border-primary/40 transition-colors">
                        <stat.icon className="w-5 h-5 text-primary" />
                      </div>
                      <div className="text-4xl font-black text-brand-text tracking-tighter mb-1">{stat.value}</div>
                      <div className="text-[10px] font-black uppercase tracking-widest text-brand-text/30">{stat.label}</div>
                    </motion.div>
                  ))}
                </div>

                {/* Recent Mission Log (Orders) */}
                <div className="glass rounded-[3rem] border border-white/5 overflow-hidden bg-brand-soft/10">
                   <div className="p-10 border-b border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                         <div className="w-2 h-8 bg-primary rounded-full" />
                         <span className="text-2xl font-black uppercase tracking-tighter text-brand-text">Mission Records</span>
                      </div>
                      <div className="bg-white/5 px-6 py-2 rounded-full border border-white/10 text-[9px] font-black uppercase tracking-widest text-brand-text/40">Latest Intel</div>
                   </div>
                   
                   <div className="divide-y divide-white/5">
                      {loading ? (
                        <div className="p-20 text-center text-brand-text/20 font-black uppercase tracking-widest text-[10px]">Encrypting Data...</div>
                      ) : orders.length === 0 ? (
                        <div className="p-20 text-center text-brand-text/20 font-black uppercase tracking-widest text-[10px]">No active missions found in system log.</div>
                      ) : orders.slice(0, 4).map((order) => (
                        <div key={order.id} className="p-8 lg:p-10 hover:bg-white/5 transition-all group flex flex-col md:flex-row md:items-center justify-between gap-6">
                           <div className="flex items-center gap-6">
                              <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 group-hover:border-primary/20 transition-colors shrink-0">
                                 <ShoppingBag className="w-6 h-6 text-primary" />
                              </div>
                              <div>
                                 <div className="text-xl font-black text-brand-text uppercase leading-none mb-2">{order.item}</div>
                                 <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-1.5 text-[10px] text-brand-text/40 font-black uppercase tracking-widest bg-white/5 px-3 py-1 rounded-lg">
                                       <Clock className="w-3 h-3" />
                                       {order.status === 'Active' ? <CountdownTimer expiryDate={order.expiryDate} /> : 'Terminated'}
                                    </div>
                                    <div className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/40 italic">#TX-{order.id.slice(-6).toUpperCase()}</div>
                                 </div>
                              </div>
                           </div>

                           <div className="flex items-center justify-between md:justify-end gap-10">
                              <div className="text-right">
                                 <div className="text-[9px] font-black tracking-widest text-brand-text/20 uppercase mb-1">Commission</div>
                                 <div className="text-2xl font-black text-brand-text tracking-tighter">${order.price}</div>
                              </div>
                              <div className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20`}>
                                 {order.status}
                              </div>
                              <button className="hidden lg:flex w-12 h-12 rounded-2xl bg-white/5 items-center justify-center hover:bg-primary hover:text-black transition-all border border-white/10 group-hover:shadow-[0_0_20px_rgba(255,164,1,0.2)]">
                                 <ExternalLink className="w-5 h-5" />
                              </button>
                           </div>
                        </div>
                      ))}
                   </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'giveaways' && (
              <motion.div key="giveaways" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pb-32 lg:pb-0 space-y-10">
                <div className="flex flex-col gap-4 border-l-4 border-primary pl-8 py-2 mb-10">
                   <h2 className="text-4xl lg:text-5xl font-black uppercase tracking-tighter text-brand-text">Joined <span className="internal-gradient">Loot Operations</span></h2>
                   <p className="text-brand-text/40 text-sm font-medium tracking-widest uppercase">Verified mission participation and rewards.</p>
                </div>
                
                {joinedGiveaways.length === 0 ? (
                  <div className="py-24 text-center glass rounded-[3rem] border border-white/5 bg-brand-soft/5">
                    <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-8 border border-white/10 group">
                       <Gift className="w-10 h-10 text-brand-text/10 group-hover:text-primary/40 transition-colors" />
                    </div>
                    <p className="text-brand-text/20 font-black uppercase tracking-[0.2em] text-[10px]">No active loot deployments detected in your frequency.</p>
                    <Link href="/giveaways">
                       <button className="mt-10 bg-primary/10 hover:bg-primary/20 text-primary px-10 py-4 rounded-2xl border border-primary/20 text-[10px] font-black uppercase tracking-widest transition-all">
                          Browse Giveaways
                       </button>
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {joinedGiveaways.map((giveawayId, i) => (
                      <div key={i} className="glass p-10 rounded-[3rem] border border-white/5 group hover:border-primary/30 transition-all bg-brand-soft/5">
                         <div className="flex items-center gap-6 mb-8">
                            <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10">
                               <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                            </div>
                            <div>
                               <div className="text-[10px] font-black uppercase tracking-widest text-brand-text/30 mb-1">Mission ID</div>
                               <div className="text-lg font-black text-brand-text uppercase">#{giveawayId.slice(-8).toUpperCase()}</div>
                            </div>
                         </div>
                         <div className="flex items-center justify-between pt-6 border-t border-white/5">
                            <div className="flex items-center gap-2 text-[10px] font-black uppercase text-emerald-400 tracking-widest">
                               <Zap className="w-4 h-4" /> Participation Verified
                            </div>
                            <button className="text-primary hover:underline text-[10px] font-black uppercase tracking-widest">Mission Status</button>
                         </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'billing' && (
              <motion.div key="billing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pb-32 lg:pb-0 space-y-10">
                <div className="flex flex-col gap-4 border-l-4 border-primary pl-8 py-2 mb-10">
                   <h2 className="text-4xl lg:text-5xl font-black uppercase tracking-tighter text-brand-text">Credits & <span className="internal-gradient">Ledger</span></h2>
                   <p className="text-brand-text/40 text-sm font-medium tracking-widest uppercase">Financial logistics and transaction history.</p>
                </div>

                <div className="glass p-12 rounded-[3.5rem] border border-white/5 bg-brand-soft/10 text-center">
                   <div className="w-24 h-24 bg-white/5 rounded-3xl mx-auto mb-10 flex items-center justify-center border border-white/10">
                      <CreditCard className="w-10 h-10 text-primary" />
                   </div>
                   <h3 className="text-2xl font-black uppercase text-brand-text mb-4">Tactical Balance</h3>
                   <div className="text-6xl font-black text-brand-text tracking-tighter mb-4">${totalSpent.toFixed(2)}</div>
                   <p className="text-[10px] font-black uppercase tracking-widest text-brand-text/20 mb-12 italic">Total allocated credits across all toolsets.</p>
                   
                   <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
                      <div className="p-6 bg-white/5 rounded-2xl border border-white/10">
                         <div className="text-[9px] font-black uppercase text-brand-text/30 mb-2">Pending</div>
                         <div className="text-xl font-black text-brand-text">$0.00</div>
                      </div>
                      <div className="p-6 bg-white/5 rounded-2xl border border-white/10">
                         <div className="text-[9px] font-black uppercase text-brand-text/30 mb-2">Refunded</div>
                         <div className="text-xl font-black text-brand-text">$0.00</div>
                      </div>
                   </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'settings' && (
              <motion.div key="settings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl mx-auto w-full pb-32 lg:pb-0">
                <div className="glass p-12 rounded-[3.5rem] border border-white/5 space-y-12 bg-brand-soft/10">
                  <div className="text-center">
                     <div className="w-24 h-24 bg-white/5 rounded-3xl mx-auto mb-8 flex items-center justify-center border border-white/10 relative">
                        <UserIcon className="w-10 h-10 text-primary" strokeWidth={1.5} />
                        <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                           <Save className="w-4 h-4 text-black" />
                        </div>
                     </div>
                     <h2 className="text-4xl font-black uppercase tracking-tighter text-brand-text mb-2">Protocol <span className="internal-gradient">Settings</span></h2>
                     <p className="text-brand-text/30 text-[10px] font-black uppercase tracking-widest">Update your biometric identity data.</p>
                  </div>
                  
                  <form onSubmit={handleUpdateProfile} className="space-y-8">
                    <div className="space-y-3">
                      <label className="text-[11px] font-black uppercase tracking-[0.2em] text-brand-text/30 ml-6">Registry Display Name</label>
                      <div className="relative group">
                        <User className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-text/20 group-focus-within:text-primary transition-colors" />
                        <input 
                          type="text" 
                          value={formData.displayName}
                          onChange={e => setFormData({...formData, displayName: e.target.value})}
                          className="w-full bg-white/5 border border-white/10 rounded-[1.5rem] px-16 py-5 focus:outline-none focus:border-primary/50 transition-all text-brand-text font-black text-sm uppercase tracking-widest placeholder:opacity-20 shadow-inner"
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[11px] font-black uppercase tracking-[0.2em] text-brand-text/30 ml-6">Encrypted Email Address</label>
                      <div className="relative group">
                        <Mail className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-text/20" />
                        <input 
                          type="email" 
                          value={formData.email}
                          readOnly
                          className="w-full bg-white/2 border border-white/5 rounded-[1.5rem] px-16 py-5 opacity-40 cursor-not-allowed text-brand-text font-black text-sm uppercase tracking-widest shadow-inner"
                        />
                      </div>
                    </div>

                    <button 
                      disabled={updating}
                      className="w-full bg-primary text-black py-6 rounded-[1.5rem] font-black uppercase tracking-[0.2em] border-b-6 border-secondary shadow-2xl shadow-primary/20 flex items-center justify-center space-x-3 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                    >
                      {updating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                      <span className="text-xs">{updating ? 'Synchronizing...' : 'Commit Changes'}</span>
                    </button>
                  </form>

                  <div className="pt-12 border-t border-white/5">
                    <div className="flex items-center gap-3 mb-6">
                       <ShieldAlert className="w-5 h-5 text-accent" />
                       <h3 className="text-xs font-black uppercase tracking-widest text-accent">Nuclear Sanction Zone</h3>
                    </div>
                    <button 
                      onClick={() => setShowDeleteModal(true)}
                      className="w-full bg-accent/5 text-accent border border-accent/20 py-5 rounded-[1.5rem] font-black uppercase tracking-widest hover:bg-accent hover:text-white transition-all flex items-center justify-center space-x-3 group/delete"
                    >
                      <Trash2 className="w-5 h-5 group-hover:animate-bounce" />
                      <span className="text-[10px]">Wipe All Memory Packs</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>
    </main>
  );
};

export default DashboardPage;
