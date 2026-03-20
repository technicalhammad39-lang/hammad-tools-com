'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Facebook, Mail, MapPin, Phone, MessageCircle, Store } from 'lucide-react';
import { useSettings } from '@/context/SettingsContext';

import { usePathname } from 'next/navigation';

const Footer = () => {
  const pathname = usePathname();
  const { settings } = useSettings();
  if (pathname.startsWith('/admin')) return null;

  return (
    <footer className="bg-brand-bg border-t border-white/5 pt-20 pb-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          {/* Brand */}
          <div className="space-y-6">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-10 h-10 relative flex items-center justify-center">
                <Image src="/logo-header.png" alt="Hammad Tools Logo" fill className="object-contain" />
              </div>
              <span className="text-2xl font-black text-brand-text">
                Hammad<span className="internal-gradient">Tools</span>
              </span>
            </Link>
            <p className="text-brand-text/60 leading-relaxed text-sm font-medium">
              The ultimate marketplace for premium digital subscriptions and tools. High-end services at affordable prices.
            </p>
            <div className="flex space-x-4">
              {settings.facebookUrl && (
                <a href={settings.facebookUrl} target="_blank" rel="noopener noreferrer" className="w-10 h-10 glass rounded-xl flex items-center justify-center hover:bg-primary/20 transition-colors border border-white/10 text-brand-text">
                  <Facebook className="w-5 h-5" />
                </a>
              )}
              {settings.whatsappUrl && (
                <a href={settings.whatsappUrl} target="_blank" rel="noopener noreferrer" className="w-10 h-10 glass rounded-xl flex items-center justify-center hover:bg-primary/20 transition-colors border border-white/10 text-brand-text">
                  <MessageCircle className="w-5 h-5" />
                </a>
              )}
              {settings.googleBusinessUrl && (
                <a href={settings.googleBusinessUrl} target="_blank" rel="noopener noreferrer" className="w-10 h-10 glass rounded-xl flex items-center justify-center hover:bg-primary/20 transition-colors border border-white/10 text-brand-text">
                  <Store className="w-5 h-5" />
                </a>
              )}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-sm font-black uppercase tracking-widest mb-6 text-brand-text">Quick Links</h4>
            <ul className="space-y-4">
              <li><Link href="/" className="text-brand-text/60 hover:text-primary transition-colors text-xs font-black uppercase tracking-widest">Home</Link></li>
              <li><Link href="/services" className="text-brand-text/60 hover:text-primary transition-colors text-xs font-black uppercase tracking-widest">Services</Link></li>
              <li><Link href="/pricing" className="text-brand-text/60 hover:text-primary transition-colors text-xs font-black uppercase tracking-widest">Pricing</Link></li>
              <li><Link href="/blog" className="text-brand-text/60 hover:text-primary transition-colors text-xs font-black uppercase tracking-widest">Blog</Link></li>
              <li><Link href="/giveaway" className="text-brand-text/60 hover:text-primary transition-colors text-xs font-black uppercase tracking-widest">Giveaway</Link></li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="text-sm font-black uppercase tracking-widest mb-6 text-brand-text">Contact Us</h4>
            <ul className="space-y-4">
              <li className="flex items-center space-x-3 text-brand-text/60">
                <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20">
                  <Mail className="w-4 h-4 text-primary" />
                </div>
                <span className="text-xs font-black uppercase tracking-widest break-all">{settings.supportEmail}</span>
              </li>
              <li className="flex items-center space-x-3 text-brand-text/60">
                <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20">
                  <MapPin className="w-4 h-4 text-primary" />
                </div>
                <span className="text-xs font-black uppercase tracking-widest break-all">Digital World, Internet</span>
              </li>
              <li className="flex items-center space-x-3 text-brand-text/60">
                <div className="p-1.5 rounded-lg bg-primary/10 border border-primary/20">
                  <Phone className="w-4 h-4 text-primary" />
                </div>
                <span className="text-xs font-black uppercase tracking-widest break-all">{settings.supportPhone}</span>
              </li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h4 className="text-sm font-black uppercase tracking-widest mb-6 text-brand-text">Newsletter</h4>
            <p className="text-brand-text/60 mb-4 text-xs font-medium">Subscribe to get the latest updates and offers.</p>
            <form className="space-y-3">
              <input 
                type="email" 
                placeholder="Your email address" 
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-primary transition-colors text-xs text-brand-text"
              />
              <button className="w-full bg-primary text-white font-black uppercase tracking-widest py-3 rounded-xl border-b-2 border-accent transition-all text-xs">
                Subscribe
              </button>
            </form>
          </div>
        </div>

        <div className="pt-8 border-t border-white/5 text-center text-brand-text/40 text-[10px] font-black uppercase tracking-widest">
          <p>© {new Date().getFullYear()} Hammad Tools. All rights reserved.</p>
          <p className="mt-2 text-[9px] text-brand-text/30">
            Developed by <a href="https://share.google/m5Mbu7GU1J4073KgO" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Clyro Tech Solutions</a> 
            &nbsp; | Partnered with <a href="https://dailyhayat.net" target="_blank" rel="noopener noreferrer" className="text-secondary hover:underline">DailyHayat</a>
          </p>
          <div className="mt-4 space-x-6">
            <Link href="/privacy" className="hover:text-brand-text/60 transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-brand-text/60 transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
