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
  Plus, 
  Search,
  LogOut,
  Ticket,
  Zap
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';

const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  const { profile, isAdmin, loading, logout } = useAuth();
  const pathname = usePathname();

  if (loading) return <div className="min-h-screen bg-brand-soft flex items-center justify-center text-primary font-black uppercase tracking-widest">Loading...</div>;
  if (!isAdmin) return <div className="min-h-screen bg-brand-soft flex items-center justify-center text-accent font-black uppercase tracking-widest">Access Denied</div>;

  const sidebarItems = [
    { id: 'dashboard', label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { id: 'orders', label: 'Order Management', href: '/admin/orders', icon: Zap },
    { id: 'tools', label: 'Manage Tools', href: '/admin/services', icon: ShoppingBag },
    { id: 'coupons', label: 'Coupons', href: '/admin/coupons', icon: Ticket },
    { id: 'giveaways', label: 'Giveaways', href: '/admin/giveaways', icon: Gift },
    { id: 'blogs', label: 'Blog Posts', href: '/admin/blog', icon: FileText },
    { id: 'users', label: 'Users', href: '/admin/users', icon: Users },
    { id: 'socials', label: 'Social Links', href: '/admin/socials', icon: Share2 },
    { id: 'settings', label: 'Settings', href: '/admin/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-brand-soft flex">
      {/* Admin Sidebar */}
      <aside className="w-80 bg-black/40 border-r border-white/5 hidden lg:flex flex-col sticky top-0 h-screen">
        <div className="p-10 border-b border-white/5">
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center border-b-4 border-[#FF8C2A]">
              <span className="text-brand-bg font-black text-2xl">H</span>
            </div>
            <span className="text-2xl font-black text-brand-text uppercase">
              Admin<span className="internal-gradient">Hub</span>
            </span>
          </Link>
        </div>

        <nav className="flex-1 p-8 space-y-3 overflow-y-auto no-scrollbar">
          <div className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-text/30 mb-6 ml-4">Main Navigation</div>
          {sidebarItems.map((item) => (
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
        <header className="h-24 border-b border-white/5 bg-black/20 backdrop-blur-2xl flex items-center justify-between px-10 sticky top-0 z-50">
          <div className="relative w-[400px] hidden md:block group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-text/20 w-5 h-5 group-focus-within:text-primary transition-colors" />
            <input 
              type="text" 
              placeholder="Query the system..." 
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-12 pr-6 text-xs font-black uppercase tracking-widest focus:outline-none focus:border-primary/50 transition-all text-brand-text"
            />
          </div>
          
          <div className="flex items-center gap-6">
            <div className="hidden lg:flex flex-col items-end mr-4">
               <div className="text-[10px] font-black uppercase tracking-widest text-brand-text/40">Server Status</div>
               <div className="flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                 <span className="text-[9px] font-black text-emerald-500 uppercase">Operational</span>
               </div>
            </div>
            <button className="bg-primary text-brand-bg px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 border-b-4 border-[#FF8C2A] shadow-xl shadow-primary/10 hover:scale-105 active:scale-95 transition-all">
              <Plus className="w-4 h-4" /> Global Action
            </button>
          </div>
        </header>

        <main className="flex-1 p-10 overflow-y-auto no-scrollbar">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
