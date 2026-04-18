'use client';

import React from 'react';
import { motion } from 'motion/react';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Gift, 
  Settings, 
  Users, 
  FileText, 
  Share2, 
  Layout,
  Bell,
  CreditCard,
  Mail,
  Search,
  LogOut,
  Ticket,
  Zap,
  Menu,
  X
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { AnimatePresence } from 'motion/react';
import NotificationBell from '@/components/NotificationBell';
import AdminOrderTicker from '@/components/AdminOrderTicker';
import { collection, getDocs, limit, query } from 'firebase/firestore';
import { db } from '@/firebase';

const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  const { profile, isAdmin, isStaff, loading, logout } = useAuth();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [searchResults, setSearchResults] = React.useState<Array<{ id: string; label: string; sub: string; href: string }>>([]);
  const [searchLoading, setSearchLoading] = React.useState(false);

  const sidebarItems = [
    { id: 'dashboard', label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { id: 'tools', label: 'Tools', href: '/admin/tools', icon: ShoppingBag, mobileLabel: 'Tools' },
    { id: 'agency', label: 'Agency Services', href: '/admin/agency-services', icon: Layout, mobileLabel: 'Agency' },
    { id: 'giveaways', label: 'Giveaway', href: '/admin/giveaways', icon: Gift, mobileLabel: 'Giveaway' },
    { id: 'blogs', label: 'Blog', href: '/admin/blog', icon: FileText, mobileLabel: 'Blog' },
    { id: 'orders', label: 'Order Management', href: '/admin/orders', icon: Zap },
    { id: 'categories', label: 'Categories', href: '/admin/categories', icon: Layout },
    { id: 'payments', label: 'Payment Methods', href: '/admin/payment-methods', icon: CreditCard },
    { id: 'notifications', label: 'Notifications', href: '/admin/notifications', icon: Bell },
    { id: 'subscribers', label: 'Subscribers', href: '/admin/subscribers', icon: Mail },
    { id: 'coupons', label: 'Coupons', href: '/admin/coupons', icon: Ticket },
    { id: 'users', label: 'Users', href: '/admin/users', icon: Users },
    { id: 'socials', label: 'Social Links', href: '/admin/socials', icon: Share2 },
    { id: 'settings', label: 'Settings', href: '/admin/settings', icon: Settings },
  ];

  const staffVisibleIds = new Set([
    'dashboard',
    'tools',
    'agency',
    'giveaways',
    'blogs',
    'orders',
    'categories',
    'notifications',
    'subscribers',
    'coupons',
  ]);

  const visibleSidebarItems = isAdmin ? sidebarItems : sidebarItems.filter((item) => staffVisibleIds.has(item.id));
  const bottomNavItems = visibleSidebarItems.slice(0, 4);
  const hamburgerItems = visibleSidebarItems.slice(4);

  React.useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    let active = true;
    setSearchLoading(true);
    const timer = setTimeout(async () => {
      try {
        const needle = searchTerm.trim().toLowerCase();
        const [
          usersSnap,
          servicesSnap,
          agencySnap,
          ordersSnap,
          categoriesSnap,
          couponsSnap,
          blogSnap,
          giveawaySnap,
          notificationsSnap,
          subscribersSnap,
        ] = await Promise.all([
          getDocs(query(collection(db, 'users'), limit(30))),
          getDocs(query(collection(db, 'services'), limit(40))),
          getDocs(query(collection(db, 'agency_services'), limit(20))),
          getDocs(query(collection(db, 'orders'), limit(30))),
          getDocs(query(collection(db, 'categories'), limit(20))),
          getDocs(query(collection(db, 'coupons'), limit(20))),
          getDocs(query(collection(db, 'blogPosts'), limit(20))),
          getDocs(query(collection(db, 'giveaways'), limit(20))),
          getDocs(query(collection(db, 'notification_dispatches'), limit(20))),
          getDocs(query(collection(db, 'newsletter_subscribers'), limit(30))),
        ]);

        const results: Array<{ id: string; label: string; sub: string; href: string }> = [];

        usersSnap.forEach((doc) => {
          const data = doc.data() as any;
          const label = data.displayName || data.email || 'User';
          const haystack = `${label} ${data.email || ''}`.toLowerCase();
          if (haystack.includes(needle)) {
            results.push({ id: `user-${doc.id}`, label, sub: 'User', href: '/admin/users' });
          }
        });

        servicesSnap.forEach((doc) => {
          const data = doc.data() as any;
          const title = data.title || data.name || 'Tool';
          const haystack = `${title} ${data.categoryName || ''}`.toLowerCase();
          if (haystack.includes(needle)) {
            results.push({
              id: `tool-${doc.id}`,
              label: title,
              sub: data.type === 'services' ? 'Service' : 'Tool',
              href: data.type === 'services' ? '/admin/agency-services' : '/admin/tools',
            });
          }
        });

        agencySnap.forEach((doc) => {
          const data = doc.data() as any;
          const title = data.title || 'Agency Service';
          const haystack = `${title} ${data.description || ''}`.toLowerCase();
          if (haystack.includes(needle)) {
            results.push({ id: `agency-${doc.id}`, label: title, sub: 'Agency Service', href: '/admin/agency-services' });
          }
        });

        ordersSnap.forEach((doc) => {
          const data = doc.data() as any;
          const orderNumber = data.orderId || data.order_id || data.orderNumber || 'Order';
          const haystack = `${orderNumber} ${data.userEmail || data.email || ''} ${data.userPhone || data.phone || ''} ${data.userName || ''}`.toLowerCase();
          if (haystack.includes(needle)) {
            results.push({ id: `order-${doc.id}`, label: orderNumber, sub: 'Order', href: `/admin/orders?order=${doc.id}` });
          }
        });

        categoriesSnap.forEach((doc) => {
          const data = doc.data() as any;
          const label = data.name || 'Category';
          if (label.toLowerCase().includes(needle)) {
            results.push({ id: `category-${doc.id}`, label, sub: 'Category', href: '/admin/categories' });
          }
        });

        couponsSnap.forEach((doc) => {
          const data = doc.data() as any;
          const label = data.code || 'Coupon';
          const haystack = `${label} ${data.description || ''}`.toLowerCase();
          if (haystack.includes(needle)) {
            results.push({ id: `coupon-${doc.id}`, label, sub: 'Coupon', href: '/admin/coupons' });
          }
        });

        blogSnap.forEach((doc) => {
          const data = doc.data() as any;
          const label = data.title || 'Blog Post';
          if (label.toLowerCase().includes(needle)) {
            results.push({ id: `blog-${doc.id}`, label, sub: 'Blog', href: '/admin/blog' });
          }
        });

        giveawaySnap.forEach((doc) => {
          const data = doc.data() as any;
          const label = data.title || 'Giveaway';
          if (label.toLowerCase().includes(needle)) {
            results.push({ id: `giveaway-${doc.id}`, label, sub: 'Giveaway', href: '/admin/giveaways' });
          }
        });

        notificationsSnap.forEach((doc) => {
          const data = doc.data() as any;
          const label = data.title || 'Notification';
          if (label.toLowerCase().includes(needle)) {
            results.push({ id: `notif-${doc.id}`, label, sub: 'Notification', href: '/admin/notifications' });
          }
        });

        subscribersSnap.forEach((doc) => {
          const data = doc.data() as any;
          const email = (data.email || '').toString();
          if (email.toLowerCase().includes(needle)) {
            results.push({ id: `subscriber-${doc.id}`, label: email, sub: 'Subscriber', href: '/admin/subscribers' });
          }
        });

        if (active) {
          setSearchResults(results.slice(0, 12));
        }
      } catch (error) {
        console.error('Admin search failed:', error);
        if (active) {
          setSearchResults([]);
        }
      } finally {
        if (active) {
          setSearchLoading(false);
        }
      }
    }, 300);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [searchTerm]);

  if (loading) {
    return <div className="min-h-screen bg-brand-soft flex items-center justify-center text-primary font-black uppercase tracking-widest">Loading...</div>;
  }
  if (!isStaff) {
    return <div className="min-h-screen bg-brand-soft flex items-center justify-center text-accent font-black uppercase tracking-widest">Access Denied</div>;
  }

  return (
    <div className="min-h-screen bg-brand-soft flex">
      {/* Admin Sidebar */}
      <aside className="w-80 bg-black/40 border-r border-white/5 hidden lg:flex flex-col sticky top-0 h-screen">
        <div className="p-10 border-b border-white/5">
          <Link href="/" className="flex items-center justify-between gap-3">
            <Image
              src="/logo-header.png"
              alt="Hammad Tools"
              width={190}
              height={42}
              className="h-10 w-auto object-contain"
              priority
            />
            <span className="text-[10px] font-black uppercase tracking-widest text-primary/80">Admin</span>
          </Link>
        </div>

        <nav className="flex-1 p-8 space-y-3 overflow-y-auto no-scrollbar">
          <div className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-text/30 mb-6 ml-4">Main Navigation</div>
          {visibleSidebarItems.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${
                pathname === item.href 
                ? 'bg-primary text-brand-bg shadow-xl shadow-primary/20 border-b-4 border-[#FF8C2A]' 
                : 'text-brand-text/40 hover:bg-white/5 hover:text-brand-text'
              }`}
            >
              <item.icon className={`w-5 h-5 ${pathname === item.href ? 'text-brand-bg' : 'text-primary'}`} />
              {item.label}
            </Link>
          ))}
          
          <div className="pt-10 mt-10 border-t border-white/5">
             <button
              onClick={logout}
              className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest text-accent/60 hover:bg-accent/10 hover:text-accent transition-all"
            >
              <LogOut className="w-5 h-5" />
              Sign Out
            </button>
          </div>
        </nav>

        <div className="p-8 border-t border-white/5 bg-black/20">
          <div className="flex items-center gap-5">
            <div className="w-12 h-12 rounded-xl overflow-hidden border-2 border-primary/20 p-0.5 relative">
              <div className="relative w-full h-full rounded-lg overflow-hidden">
                <Image 
                  src={profile?.photoURL || `https://ui-avatars.com/api/?name=${profile?.displayName}`} 
                  alt="Admin" 
                  fill
                  className="object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
            <div className="overflow-hidden">
              <div className="font-black text-sm truncate text-brand-text uppercase">{profile?.displayName || 'Admin'}</div>
              <div className="text-[9px] font-black uppercase tracking-widest text-primary italic">System Overseer</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Header */}
        <header className="h-20 lg:h-24 border-b border-white/5 bg-black/20 backdrop-blur-2xl flex items-center justify-between px-4 lg:px-10 sticky top-0 z-[80]">
          <div className="flex items-center gap-4 lg:hidden">
            <Link href="/" className="inline-flex items-center">
              <Image
                src="/logo-header.png"
                alt="Hammad Tools"
                width={130}
                height={28}
                className="h-7 w-auto object-contain"
              />
            </Link>
          </div>

          <div className="relative w-[420px] hidden md:block group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-text/20 w-5 h-5 group-focus-within:text-primary transition-colors" />
            <input 
              type="text" 
              placeholder="Query the system..." 
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-12 pr-6 text-xs font-black uppercase tracking-widest focus:outline-none focus:border-primary/50 transition-all text-brand-text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              onFocus={() => setSearchOpen(true)}
              onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
            />
            {searchOpen && (searchTerm.trim().length > 0 || searchResults.length > 0) ? (
              <div className="absolute top-[110%] left-0 w-full bg-black/90 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[120]">
                <div className="p-3 text-[9px] font-black uppercase tracking-widest text-brand-text/40 border-b border-white/5 flex items-center justify-between">
                  <span>Search Results</span>
                  {searchLoading ? <span className="text-primary">Searching...</span> : null}
                </div>
                <div className="max-h-72 overflow-y-auto no-scrollbar">
                  {searchResults.length === 0 ? (
                    <div className="p-4 text-[10px] font-black uppercase tracking-widest text-brand-text/30">
                      No matches found.
                    </div>
                  ) : (
                    searchResults.map((result) => (
                      <Link
                        key={result.id}
                        href={result.href}
                        onClick={() => setSearchOpen(false)}
                        className="flex items-center justify-between px-4 py-3 border-b border-white/5 hover:bg-white/5 transition-colors"
                      >
                        <div>
                          <div className="text-[10px] font-black uppercase tracking-widest text-brand-text">{result.label}</div>
                          <div className="text-[9px] font-black uppercase tracking-widest text-brand-text/40">{result.sub}</div>
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-widest text-primary">Open</span>
                      </Link>
                    ))
                  )}
                </div>
              </div>
            ) : null}
          </div>
          
          <div className="flex items-center gap-4 lg:gap-6 relative">
            <NotificationBell />
            <div className="hidden lg:flex flex-col items-end mr-4">
               <div className="text-[10px] font-black uppercase tracking-widest text-brand-text/40">Server Status</div>
               <div className="flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                 <span className="text-[9px] font-black text-emerald-500 uppercase">Operational</span>
               </div>
            </div>
            
            
            {/* Mobile Hamburger Menu Toggle */}
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-3 bg-white/5 rounded-xl text-brand-text/60 hover:text-primary transition-colors"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {/* Mobile Utility Dropdown Dropdown */}
            <AnimatePresence>
              {isMobileMenuOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute top-16 right-0 w-64 bg-black/95 backdrop-blur-3xl border border-white/10 rounded-2xl p-4 shadow-2xl z-50 lg:hidden flex flex-col gap-2"
                >
                  {hamburgerItems.map(item => (
                    <Link
                      key={item.id}
                      href={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                        pathname === item.href ? 'bg-primary text-black' : 'text-brand-text/60 hover:bg-white/5 hover:text-brand-text'
                      }`}
                    >
                      <item.icon className="w-4 h-4" />
                      {item.label}
                    </Link>
                  ))}
                  <div className="h-px bg-white/10 my-2" />
                  <button onClick={logout} className="flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-accent/60 hover:bg-accent/10 hover:text-accent transition-all w-full text-left">
                    <LogOut className="w-4 h-4" /> Sign Out
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </header>

        <AdminOrderTicker />

        <main className="flex-1 p-4 lg:p-10 overflow-y-auto no-scrollbar pb-32 lg:pb-10">
          {children}
        </main>

        {/* Admin Mobile Bottom Navigation */}
        <div className="lg:hidden fixed bottom-0 left-0 w-full z-[80] bg-[#0A0A0A]/95 backdrop-blur-2xl border-t border-white/5 flex justify-around items-center py-4 px-3 pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.8)]">
          {bottomNavItems.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className={`flex flex-col items-center gap-1.5 transition-all ${
                pathname === item.href ? 'text-primary' : 'text-brand-text/40'
              }`}
            >
              <div className={`p-2.5 rounded-2xl transition-all ${pathname === item.href ? 'bg-primary/20' : ''}`}>
                <item.icon className={`w-6 h-6 ${pathname === item.href ? 'drop-shadow-[0_0_8px_rgba(255,140,42,0.8)]' : ''}`} />
              </div>
              <span className="text-[8px] font-black uppercase tracking-widest text-center">
                {item.mobileLabel || item.label}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;

