'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, X, User, ShoppingBag } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const { user, profile } = useAuth();
  const { totalItems, setIsCartOpen } = useCart();
  const isAdminRoute = pathname.startsWith('/admin');

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const desktopNavLinks = [
    { name: 'Home', href: '/' },
    { name: 'Tools', href: '/tools' },
    { name: 'Services', href: '/services' },
    { name: 'Giveaway', href: '/giveaway' },
    { name: 'About', href: '/about' },
  ];

  const mobileNavLinks = [
    { name: 'Home', href: '/' },
    { name: 'Tools', href: '/tools' },
    { name: 'Services', href: '/services' },
    { name: 'Blog', href: '/blog' },
    { name: 'Giveaway', href: '/giveaway' },
    { name: 'About', href: '/about' },
  ];

  if (isAdminRoute) return null;

  return (
    <nav className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-300 ${scrolled ? 'glass py-2.5' : 'bg-transparent py-4'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          <Link href="/" className="flex items-center space-x-3 transition-transform hover:scale-105 active:scale-95 group">
            <div className="relative h-10 w-10 sm:h-11 sm:w-11">
              <Image 
                src="/logo-header.png" 
                alt="Hammad Tools Logo" 
                fill
                className="object-contain"
                priority
              />
            </div>
            <span className="text-lg sm:text-xl 2xl:text-2xl font-black text-brand-text uppercase leading-none tracking-[0.03em]">
              Hammad<span className="internal-gradient">Tools</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden xl:flex items-center flex-1 ml-8">
            <div className="flex items-center justify-center flex-1 gap-7 2xl:gap-10">
              {desktopNavLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`text-[11px] 2xl:text-[12px] font-black uppercase tracking-[0.16em] transition-colors hover:text-primary ${pathname === link.href ? 'text-primary' : 'text-brand-text/40'}`}
                >
                  {link.name}
                </Link>
              ))}
            </div>
            
            <div className="flex items-center space-x-4 2xl:space-x-5 ml-8 shrink-0">
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
                <div className="flex items-center border-l border-white/5 pl-4">
                  <Link href="/dashboard" className="w-10 h-10 rounded-xl overflow-hidden border border-primary/20 relative cursor-pointer hover:border-primary/50 transition-all hover:scale-105">
                    <Image 
                      src={profile?.photoURL || `https://ui-avatars.com/api/?name=${profile?.displayName}`} 
                      alt="Profile" 
                      fill
                      className="object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </Link>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="bg-primary hover:bg-primary/90 text-brand-bg px-5 2xl:px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.14em] transition-all hover:scale-105 active:scale-95 border-b-4 border-[#FF8C2A] shadow-lg shadow-primary/10 inline-flex items-center justify-center"
                >
                  Login
                </Link>
              )}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="xl:hidden flex items-center space-x-4">
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
            className="xl:hidden bg-gradient-to-b from-[#0A0A0A] to-[#121212] border-t border-white/5 overflow-hidden shadow-2xl"
          >
            <div className="px-4 pt-2 pb-10 space-y-1">
              {mobileNavLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className={`block px-3 py-4 text-lg font-black uppercase tracking-[0.16em] ${pathname === link.href ? 'text-primary' : 'text-brand-text/40'}`}
                >
                  {link.name}
                </Link>
              ))}
              <div className="pt-6 border-t border-white/5 mx-3">
                {user ? (
                  <div className="flex items-center justify-between">
                    <Link href="/dashboard" onClick={() => setIsOpen(false)} className="flex items-center space-x-3 text-brand-text/40 font-black uppercase tracking-widest text-sm">
                      <User className="w-5 h-5" />
                      <span>My Profile</span>
                    </Link>
                  </div>
                ) : (
                  <Link
                    href="/login"
                    onClick={() => setIsOpen(false)}
                    className="w-full bg-primary text-brand-bg py-5 rounded-xl font-black uppercase tracking-widest text-sm border-b-4 border-[#FF8C2A] shadow-lg shadow-primary/10 inline-flex items-center justify-center"
                  >
                    Login
                  </Link>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;

