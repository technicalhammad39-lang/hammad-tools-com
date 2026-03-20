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
  Shield,
  Plus
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
    { id: 'requests', label: 'Requests', icon: Clock },
    { id: 'giveaways', label: 'Giveaways', icon: Gift },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const totalSpent = orders.reduce((acc: number, order: Order) => acc + (Number(order.price) || 0), 0);
  const activeSubs = orders.filter((o: any) => o.status === 'Active').length;

  const stats = [
    { label: 'Active Subscriptions', value: activeSubs.toString(), icon: Zap, color: 'text-primary' },
    { label: 'Total Spent', value: `Rs ${totalSpent.toFixed(2)}`, icon: CreditCard, color: 'text-purple-500' },
    { label: 'Giveaways Joined', value: joinedGiveaways.length.toString(), icon: Gift, color: 'text-pink-500' },
  ];

  return (
    <main className="min-h-screen pt-24 pb-32 md:pb-12 px-4 bg-brand-bg">
      {/* Mobile Header */}
      <div className="lg:hidden flex items-center justify-between mb-8 pb-6 border-b border-white/5">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl border border-primary/20 p-0.5">
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
            <div className="text-xs font-black text-brand-text uppercase">Welcome back,</div>
            <div className="text-sm font-black text-primary uppercase">{profile?.displayName?.split(' ')[0]}</div>
          </div>
        </div>
        <button onClick={logout} className="p-2.5 bg-white/5 rounded-xl border border-white/10 text-brand-text/40">
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-10">
        
        {/* Sidebar - Desktop Layout */}
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
              <div className="overflow-hidden">
                <div className="font-black text-base truncate text-brand-text uppercase">{profile?.displayName || 'User'}</div>
                <div className="text-[9px] font-black uppercase tracking-widest text-primary truncate opacity-60">Verified Member</div>
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
                </button>
              ))}
              
              <div className="pt-4 mt-4 border-t border-white/5">
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-3 px-5 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest text-accent/60 hover:bg-accent/10 hover:text-accent transition-all"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </nav>
          </div>
        </aside>

        {/* Dashboard Content Area */}
        <div className="flex-1 space-y-10 relative">
          
          {/* Mobile Bottom Navigation Bar */}
          <div className="md:hidden fixed bottom-0 left-0 w-full z-50 bg-[#0A0A0A]/90 backdrop-blur-2xl border-t border-white/5 flex justify-around items-center py-4 px-2 safe-area-pb">
            {sidebarItems.slice(0, 4).map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center gap-1 transition-all ${
                  activeTab === item.id ? 'text-primary' : 'text-brand-text/30'
                }`}
              >
                <item.icon className={`w-5 h-5 ${activeTab === item.id ? 'fill-primary/10' : ''}`} />
                <span className="text-[7px] font-black uppercase tracking-[0.2em]">{item.label}</span>
              </button>
            ))}
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex flex-col items-center gap-1 transition-all ${
                activeTab === 'settings' ? 'text-primary' : 'text-brand-text/30'
              }`}
            >
              <Settings className="w-5 h-5" />
              <span className="text-[7px] font-black uppercase tracking-[0.2em]">Settings</span>
            </button>
          </div>

          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div 
                key="overview"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                {/* Modern Greeting */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2">
                  <div>
                    <h2 className="text-3xl md:text-5xl font-black text-brand-text mb-2">
                      Welcome, <span className="text-primary">{profile?.displayName?.split(' ')[0] || 'User'}</span>
                    </h2>
                    <p className="text-brand-text/40 text-xs md:text-sm font-medium uppercase tracking-[0.1em]">Managing your premium digital assets</p>
                  </div>
                  <Link href="/services">
                    <button className="bg-primary text-black px-8 py-4 rounded-xl font-black uppercase tracking-widest text-[10px] border-b-4 border-secondary shadow-lg hover:scale-105 transition-all">
                      Deploy New Tools
                    </button>
                  </Link>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {stats.map((stat, i) => (
                    <div key={i} className="glass p-8 rounded-3xl border border-white/5 bg-brand-soft/5 group hover:border-primary/20 transition-all">
                      <div className="flex items-center justify-between mb-6">
                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 text-primary">
                          <stat.icon className="w-5 h-5" />
                        </div>
                      </div>
                      <div className="text-3xl font-black text-brand-text mb-1">{stat.value}</div>
                      <div className="text-[9px] font-black uppercase tracking-widest text-brand-text/30">{stat.label}</div>
                    </div>
                  ))}
                </div>

                {/* Active Subscriptions Summary */}
                <div className="glass rounded-[2rem] border border-white/5 overflow-hidden bg-brand-soft/5">
                   <div className="p-8 border-b border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                         <div className="w-1.5 h-6 bg-primary rounded-full" />
                         <span className="text-lg font-black uppercase text-brand-text">Active Mainframe</span>
                      </div>
                      <button onClick={() => setActiveTab('orders')} className="text-[9px] font-black uppercase tracking-widest text-primary/60 hover:text-primary transition-colors">View All Orders</button>
                   </div>
                   
                   <div className="divide-y divide-white/5 text-left">
                      {loading ? (
                        <div className="p-16 text-center text-brand-text/20 font-black uppercase tracking-widest text-[10px]">Synchronizing...</div>
                      ) : orders.filter(o => o.status === 'Active').length === 0 ? (
                        <div className="p-16 text-center">
                           <p className="text-brand-text/20 font-black uppercase tracking-widest text-[10px] mb-6">No active subscriptions detected.</p>
                           <Link href="/services" className="text-primary text-[10px] font-black uppercase tracking-[0.2em] border-b border-primary/20 pb-1">Browse Catalog</Link>
                        </div>
                      ) : orders.filter(o => o.status === 'Active').slice(0, 3).map((order) => (
                        <div key={order.id} className="p-8 flex items-center justify-between group">
                           <div className="flex items-center gap-5">
                              <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 group-hover:border-primary/30 transition-all">
                                 <Zap className="w-5 h-5 text-primary" />
                              </div>
                              <div>
                                 <div className="text-base font-black text-brand-text uppercase leading-none mb-1.5">{order.item}</div>
                                 <div className="flex items-center gap-4 text-[9px] font-black text-brand-text/30 uppercase tracking-widest">
                                    <span>Expires: <CountdownTimer expiryDate={order.expiryDate} /></span>
                                 </div>
                              </div>
                           </div>
                           <Link href="/services" className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-widest group-hover:bg-primary group-hover:text-black transition-all">
                              Manage
                           </Link>
                        </div>
                      ))}
                   </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'orders' && (
              <motion.div key="orders" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div className="flex justify-between items-end mb-8">
                   <div>
                      <h2 className="text-3xl font-black uppercase text-brand-text">My Orders</h2>
                      <p className="text-brand-text/30 text-[10px] font-black uppercase tracking-widest mt-1">Full transaction and activation history.</p>
                   </div>
                   <Link href="/services">
                      <button className="flex items-center gap-2 bg-emerald-500/10 text-emerald-400 px-5 py-3 rounded-xl border border-emerald-500/20 text-[9px] font-black uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition-all">
                         <Plus className="w-3.5 h-3.5" /> Buy New Subscription
                      </button>
                   </Link>
                </div>

                <div className="space-y-4">
                  {orders.length === 0 ? (
                    <div className="glass p-20 rounded-[2rem] text-center border border-white/5">
                       <ShoppingBag className="w-12 h-12 text-brand-text/10 mx-auto mb-6" />
                       <p className="text-brand-text/40 font-black uppercase tracking-widest text-[10px]">No orders found in database.</p>
                       <Link href="/services" className="inline-block mt-8 bg-primary/10 text-primary px-10 py-4 rounded-xl border border-primary/20 font-black uppercase tracking-widest text-[10px]">Shop Services</Link>
                    </div>
                  ) : (
                    orders.map((order: Order) => (
                      <div key={order.id} className="glass p-6 rounded-2xl border border-white/5 flex flex-col md:flex-row items-center justify-between gap-6 hover:border-white/10 transition-all text-left">
                         <div className="flex items-center gap-5 w-full md:w-auto">
                            <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 text-primary shrink-0">
                               <CheckCircle2 className="w-6 h-6" />
                            </div>
                            <div>
                               <div className="text-lg font-black text-brand-text uppercase leading-none mb-1">{order.item}</div>
                               <div className="text-[9px] font-black uppercase tracking-widest text-brand-text/30">Purchased on: {order.date}</div>
                            </div>
                         </div>
                         <div className="flex items-center justify-between md:justify-end gap-10 w-full md:w-auto">
                            <div className="text-right">
                               <div className="text-[9px] font-black tracking-widest text-brand-text/20 uppercase mb-1">Amount</div>
                               <div className="text-xl font-black text-brand-text">Rs {Number(order.price).toFixed(2)}</div>
                            </div>
                            <div className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase border ${
                               order.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-accent/10 text-accent border-accent/20'
                            }`}>
                              {order.status}
                            </div>
                         </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'requests' && (
              <motion.div key="requests" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                 <div className="mb-10">
                    <h2 className="text-3xl font-black uppercase text-brand-text">Activation Requests</h2>
                    <p className="text-brand-text/30 text-[10px] font-black uppercase tracking-widest mt-1">Real-time status of your deployment queries.</p>
                 </div>

                 <div className="space-y-4">
                   {orders.filter(o => o.status !== 'Active').length === 0 ? (
                     <div className="p-20 glass rounded-[2rem] text-center border border-white/5">
                        <Clock className="w-12 h-12 text-brand-text/10 mx-auto mb-6" />
                        <p className="text-brand-text/40 font-black uppercase tracking-widest text-[10px]">No pending requests in your frequency.</p>
                     </div>
                   ) : orders.filter(o => o.status !== 'Active').map((req: any) => (
                     <div key={req.id} className="glass p-8 rounded-[2rem] border border-white/5 space-y-6 text-left">
                        <div className="flex items-center justify-between">
                           <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/10">
                                 <Zap className="w-5 h-5" />
                              </div>
                              <h3 className="text-xl font-black uppercase text-brand-text">{req.item}</h3>
                           </div>
                           <div className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                              req.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                              req.status === 'Declined' ? 'bg-accent/10 text-accent border-accent/20' :
                              'bg-amber-500/10 text-amber-400 border-amber-500/20'
                           }`}>
                             {req.status || 'Pending'}
                           </div>
                        </div>
                        
                        {(req.adminNote || req.description) && (
                          <div className="p-5 bg-white/5 rounded-2xl border border-white/10">
                             <div className="text-[8px] font-black uppercase tracking-wider text-brand-text/30 mb-2">Admin Transmission:</div>
                             <p className="text-xs font-medium text-brand-text/70 italic leading-relaxed">
                               &quot;{req.adminNote || req.description}&quot;
                             </p>
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-4 border-t border-white/5">
                           <div className="text-[9px] font-black uppercase tracking-[0.2em] text-brand-text/20">Ref ID: {req.id.slice(-8).toUpperCase()}</div>
                           <button className="text-[9px] font-black uppercase tracking-widest text-primary/60">Contact Support</button>
                        </div>
                     </div>
                   ))}
                 </div>
              </motion.div>
            )}

            {activeTab === 'giveaways' && (
              <motion.div key="giveaways" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <h2 className="text-3xl font-black uppercase text-brand-text">Joined Events</h2>
                {joinedGiveaways.length === 0 ? (
                  <div className="py-24 text-center glass rounded-[2rem] border border-white/5 bg-brand-soft/5">
                    <Gift className="w-10 h-10 text-brand-text/10 mx-auto mb-6" />
                    <p className="text-brand-text/40 font-black uppercase tracking-widest text-[10px]">No giveaway participations recorded.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {joinedGiveaways.map((giveawayId, i) => (
                      <div key={i} className="glass p-8 rounded-[2rem] border border-white/5 group hover:border-primary/20 transition-all text-left">
                         <div className="text-[9px] font-black uppercase tracking-widest text-brand-text/30 mb-2">Event Ticket</div>
                         <div className="text-lg font-black text-brand-text uppercase mb-4">#{giveawayId.slice(-8).toUpperCase()}</div>
                         <div className="flex flex-wrap gap-2">
                           <span className="text-[8px] font-black uppercase bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full border border-emerald-500/20">Verified Identity</span>
                           <span className="text-[8px] font-black uppercase bg-primary/10 text-primary px-3 py-1 rounded-full border border-primary/20">Active Slot</span>
                         </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'settings' && (
              <motion.div key="settings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-xl mx-auto w-full">
                <div className="glass p-10 rounded-[2.5rem] border border-white/5 space-y-10 bg-brand-soft/10">
                  <div className="text-center">
                     <div className="w-20 h-20 bg-white/5 rounded-2xl mx-auto mb-6 flex items-center justify-center border border-white/10 relative">
                        <UserIcon className="w-8 h-8 text-primary" strokeWidth={1.5} />
                     </div>
                     <h2 className="text-3xl font-black uppercase text-brand-text">Profile Security</h2>
                     <p className="text-brand-text/30 text-[9px] font-black uppercase tracking-widest mt-1">Configure your personal access parameters.</p>
                  </div>
                  
                  <form onSubmit={handleUpdateProfile} className="space-y-6">
                    <div className="space-y-2 text-left">
                      <label className="text-[10px] font-black uppercase tracking-widest text-brand-text/30 ml-4">Full Display Name</label>
                      <input 
                        type="text" 
                        value={formData.displayName}
                        onChange={e => setFormData({...formData, displayName: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 focus:outline-none focus:border-primary/50 transition-all text-brand-text font-black text-xs uppercase tracking-widest placeholder:opacity-20 shadow-inner"
                      />
                    </div>

                    <div className="space-y-2 text-left">
                      <label className="text-[10px] font-black uppercase tracking-widest text-brand-text/30 ml-4">Access Email</label>
                      <input 
                        type="email" 
                        value={formData.email}
                        readOnly
                        className="w-full bg-white/2 border border-white/5 rounded-2xl px-6 py-4 opacity-40 cursor-not-allowed text-brand-text font-black text-xs uppercase tracking-widest"
                      />
                    </div>

                    <button 
                      disabled={updating}
                      className="w-full bg-primary text-black py-5 rounded-2xl font-black uppercase tracking-widest border-b-4 border-secondary shadow-lg flex items-center justify-center space-x-3 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                    >
                      {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      <span className="text-[10px]">{updating ? 'Syncing...' : 'Apply Overrides'}</span>
                    </button>
                  </form>

                  <div className="pt-8 border-t border-white/5">
                    <button 
                      onClick={() => setShowDeleteModal(true)}
                      className="w-full bg-accent/5 text-accent border border-accent/20 py-4 rounded-xl font-black uppercase tracking-widest text-[9px] hover:bg-accent hover:text-white transition-all"
                    >
                      Delete Account Permanent
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
