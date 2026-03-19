'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, X, User, LogOut, LayoutDashboard, ShoppingBag } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import AuthModal from '@/components/AuthModal';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const { user, profile, logout, isAdmin } = useAuth();
  const { totalItems, setIsCartOpen } = useCart();

  if (pathname.startsWith('/admin')) return null;

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Home', href: '/' },
    { name: 'Services', href: '/services' },
    { name: 'Blog', href: '/blog' },
    { name: 'Giveaway', href: '/giveaway' },
    { name: 'Contact', href: '/contact' },
  ];

  return (
    <nav className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-300 ${scrolled ? 'glass py-3' : 'bg-transparent py-5'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          <Link href="/" className="flex items-center space-x-3 transition-transform hover:scale-105 active:scale-95 group">
            <div className="relative h-10 w-10 sm:h-12 sm:w-12">
              <Image 
                src="/logo-header.png" 
                alt="Hammad Tools Logo" 
                fill
                className="object-contain"
                priority
              />
            </div>
            <span className="text-xl sm:text-2xl font-black tracking-tighter text-brand-text uppercase leading-none">
              Hammad<span className="internal-gradient">Tools</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-12">
            <div className="flex items-center space-x-10">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`text-sm lg:text-base font-black uppercase tracking-[0.2em] transition-colors hover:text-primary ${pathname === link.href ? 'text-primary' : 'text-brand-text/40'}`}
                >
                  {link.name}
                </Link>
              ))}
            </div>
            
            <div className="flex items-center space-x-6">
              <button 
                onClick={() => setIsCartOpen(true)}
                className="relative p-2 hover:bg-white/5 rounded-full transition-colors group"
              >
                <ShoppingBag className="w-6 h-6 text-brand-text/40 group-hover:text-primary" />
                {totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-brand-bg text-[10px] font-black rounded-full flex items-center justify-center border border-[#FF8C2A]">
                    {totalItems}
                  </span>
                )}
              </button>

              {user ? (
                <div className="flex items-center space-x-4 border-l border-white/5 pl-6">
                  <Link href="/dashboard" className="p-2 hover:bg-white/5 rounded-full transition-colors text-brand-text/40 hover:text-primary">
                    <LayoutDashboard className="w-5 h-5" />
                  </Link>
                  <button onClick={logout} className="p-2 hover:bg-white/5 rounded-full transition-colors text-accent/60 hover:text-accent">
                    <LogOut className="w-5 h-5" />
                  </button>
                  <div className="w-10 h-10 rounded-xl overflow-hidden border border-primary/20 relative">
                    <Image 
                      src={profile?.photoURL || `https://ui-avatars.com/api/?name=${profile?.displayName}`} 
                      alt="Profile" 
                      fill
                      className="object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setIsAuthModalOpen(true)}
                  className="bg-primary hover:bg-primary/90 text-brand-bg px-10 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 border-b-4 border-[#FF8C2A] shadow-lg shadow-primary/10"
                >
                  Login
                </button>
              )}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center space-x-4">
            <button 
              onClick={() => setIsCartOpen(true)}
              className="relative p-2 text-brand-text/40"
            >
              <ShoppingBag className="w-6 h-6" />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-brand-bg text-[10px] font-black rounded-full flex items-center justify-center border border-[#FF8C2A]">
                  {totalItems}
                </span>
              )}
            </button>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-brand-text/40 p-2"
            >
              {isOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-gradient-to-b from-[#0A0A0A] to-[#121212] border-t border-white/5 overflow-hidden shadow-2xl"
          >
            <div className="px-4 pt-2 pb-10 space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className={`block px-3 py-5 text-xl font-black uppercase tracking-widest ${pathname === link.href ? 'text-primary' : 'text-brand-text/40'}`}
                >
                  {link.name}
                </Link>
              ))}
              <div className="pt-6 border-t border-white/5 mx-3">
                {user ? (
                  <div className="flex items-center justify-between">
                    <Link href="/dashboard" onClick={() => setIsOpen(false)} className="flex items-center space-x-3 text-brand-text/40 font-black uppercase tracking-widest text-sm">
                      <LayoutDashboard className="w-5 h-5" />
                      <span>Dashboard</span>
                    </Link>
                    <button onClick={logout} className="text-accent/60 font-black uppercase tracking-widest text-sm">Logout</button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setIsAuthModalOpen(true); setIsOpen(false); }}
                    className="w-full bg-primary text-brand-bg py-5 rounded-xl font-black uppercase tracking-widest text-sm border-b-4 border-[#FF8C2A] shadow-lg shadow-primary/10"
                  >
                    Login
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </nav>
  );
};

export default Navbar;
