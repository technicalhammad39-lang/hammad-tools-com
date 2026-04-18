'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Mail, MapPin, Phone } from 'lucide-react';
import { FaFacebook, FaInstagram, FaWhatsapp, FaSnapchat, FaTiktok, FaGoogle } from 'react-icons/fa6';
import { useSettings } from '@/context/SettingsContext';

import { usePathname } from 'next/navigation';

const Footer = () => {
  const pathname = usePathname();
  const { settings } = useSettings();
  const [newsletterEmail, setNewsletterEmail] = React.useState('');
  const [newsletterLoading, setNewsletterLoading] = React.useState(false);
  const [newsletterMessage, setNewsletterMessage] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null);
  if (pathname.startsWith('/admin')) return null;

  const handleNewsletterSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const email = newsletterEmail.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

    if (!emailRegex.test(email)) {
      setNewsletterMessage({ type: 'error', text: 'Please enter a valid email address.' });
      return;
    }

    setNewsletterLoading(true);
    setNewsletterMessage(null);

    try {
      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          source: 'footer-newsletter',
          pagePath: pathname,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        success?: boolean;
        duplicate?: boolean;
        message?: string;
        error?: string;
      };

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || `Subscription failed (HTTP ${response.status}).`);
      }

      setNewsletterMessage({
        type: 'success',
        text: payload.duplicate ? 'Already subscribed. You are on the list.' : 'Subscribed successfully.',
      });
      setNewsletterEmail('');
    } catch (error) {
      setNewsletterMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to subscribe. Please try again.',
      });
    } finally {
      setNewsletterLoading(false);
    }
  };

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
            <div className="flex flex-wrap gap-4">
              {settings.facebookUrl && (
                <a href={settings.facebookUrl} target="_blank" rel="noopener noreferrer" className="w-10 h-10 glass rounded-xl flex items-center justify-center hover:bg-primary/20 transition-colors border border-white/10 text-brand-text" title="Facebook">
                  <FaFacebook className="w-5 h-5" />
                </a>
              )}
              {settings.instagramUrl && (
                <a href={settings.instagramUrl} target="_blank" rel="noopener noreferrer" className="w-10 h-10 glass rounded-xl flex items-center justify-center hover:bg-primary/20 transition-colors border border-white/10 text-brand-text" title="Instagram">
                  <FaInstagram className="w-5 h-5" />
                </a>
              )}
              {settings.whatsappUrl && (
                <a href={settings.whatsappUrl} target="_blank" rel="noopener noreferrer" className="w-10 h-10 glass rounded-xl flex items-center justify-center hover:bg-primary/20 transition-colors border border-white/10 text-brand-text" title="WhatsApp">
                  <FaWhatsapp className="w-5 h-5" />
                </a>
              )}
              {settings.snapchatUrl && (
                <a href={settings.snapchatUrl} target="_blank" rel="noopener noreferrer" className="w-10 h-10 glass rounded-xl flex items-center justify-center hover:bg-primary/20 transition-colors border border-white/10 text-brand-text" title="Snapchat">
                  <FaSnapchat className="w-5 h-5" />
                </a>
              )}
              {settings.tiktokUrl && (
                <a href={settings.tiktokUrl} target="_blank" rel="noopener noreferrer" className="w-10 h-10 glass rounded-xl flex items-center justify-center hover:bg-primary/20 transition-colors border border-white/10 text-brand-text" title="TikTok">
                  <FaTiktok className="w-5 h-5" />
                </a>
              )}
              {settings.googleBusinessUrl && (
                <a href={settings.googleBusinessUrl} target="_blank" rel="noopener noreferrer" className="w-10 h-10 glass rounded-xl flex items-center justify-center hover:bg-primary/20 transition-colors border border-white/10 text-brand-text" title="Google Business">
                  <FaGoogle className="w-5 h-5" />
                </a>
              )}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-sm font-black uppercase tracking-widest mb-6 text-brand-text">Quick Links</h4>
            <ul className="space-y-4">
              <li><Link href="/" className="text-brand-text/60 hover:text-primary transition-colors text-xs font-black uppercase tracking-widest">Home</Link></li>
              <li><Link href="/tools" className="text-brand-text/60 hover:text-primary transition-colors text-xs font-black uppercase tracking-widest">Premium Tools</Link></li>
              <li><Link href="/services" className="text-brand-text/60 hover:text-primary transition-colors text-xs font-black uppercase tracking-widest">Agency Services</Link></li>
              <li><Link href="/about" className="text-brand-text/60 hover:text-primary transition-colors text-xs font-black uppercase tracking-widest">About Us</Link></li>
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
            <form className="space-y-3" onSubmit={handleNewsletterSubmit}>
              <input
                type="email"
                placeholder="Your email address"
                value={newsletterEmail}
                onChange={(event) => setNewsletterEmail(event.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-primary transition-colors text-xs text-brand-text"
              />
              <button
                type="submit"
                disabled={newsletterLoading}
                className="w-full bg-primary text-white font-black uppercase tracking-widest py-3 rounded-xl border-b-2 border-accent transition-all text-xs disabled:opacity-60"
              >
                {newsletterLoading ? 'Subscribing...' : 'Subscribe'}
              </button>
              {newsletterMessage ? (
                <p className={`text-[10px] font-black uppercase tracking-widest ${newsletterMessage.type === 'success' ? 'text-emerald-400' : 'text-accent'}`}>
                  {newsletterMessage.text}
                </p>
              ) : null}
            </form>
          </div>
        </div>

        <div className="pt-8 border-t border-white/5 text-center text-brand-text/40 text-[10px] font-black uppercase tracking-widest">
          <p>© {new Date().getFullYear()} Hammad Tools. All rights reserved.</p>
          <p className="mt-2 text-[9px] text-brand-text/30">
            Developed by <a href="https://wa.me/923209310656" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Khaksar Agency</a>
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
