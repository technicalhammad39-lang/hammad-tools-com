'use client';

import React from 'react';
import { motion } from 'motion/react';
import { Mail, MessageSquare, Send, MapPin, Globe } from 'lucide-react';
import { FaFacebook, FaInstagram, FaWhatsapp, FaSnapchat, FaTiktok, FaGoogle } from 'react-icons/fa6';
import { useSettings } from '@/context/SettingsContext';

const ContactPage = () => {
  const { settings } = useSettings();

  // Helper to strip non-numeric chars for wa.me link
  const cleanPhone = settings.supportPhone.replace(/\D/g, '');
  const waLink = `https://wa.me/${cleanPhone}`;
  return (
    <main className="min-h-screen pt-20 md:pt-24 pb-20 px-4 bg-brand-bg">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div data-gsap-reveal className="text-center mb-8 md:mb-12">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-7xl lg:text-8xl font-black uppercase mb-4 text-brand-text md:whitespace-nowrap"
          >
            <span className="font-serif italic text-white normal-case">Get</span> In <span className="internal-gradient">Touch</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-brand-text/60 max-w-2xl mx-auto text-base md:text-lg mt-2"
          >
            Have questions? Our team is here to help you 24/7.
          </motion.p>
        </div>

        <div data-gsap-reveal className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Contact Info */}
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { id: 'email', label: 'Email Us', value: settings.supportEmail, icon: Mail, color: 'text-primary' },
                { id: 'chat', label: 'Live Chat', value: 'Available 24/7', icon: MessageSquare, color: 'text-primary' },
                { id: 'location', label: 'Location', value: 'Digital Space, Global', icon: MapPin, color: 'text-primary' },
                { id: 'socials', label: 'Socials', value: '', icon: Globe, color: 'text-primary' },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="glass p-4 rounded-xl border border-white/10 group hover:border-primary/30 transition-all flex items-center space-x-4"
                >
                  <div className={`w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center ${item.color} border border-primary/20 shrink-0`}>
                    <item.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="text-[10px] font-black uppercase tracking-widest text-brand-text/40">{item.label}</div>
                    {item.id === 'socials' ? (
                      <div className="flex items-center gap-3 mt-1">
                        {settings.whatsappUrl && (
                          <a href={settings.whatsappUrl} target="_blank" rel="noopener noreferrer" className="text-brand-text/60 hover:text-[#25D366] transition-colors" title="WhatsApp"><FaWhatsapp className="w-4 h-4" /></a>
                        )}
                        {settings.instagramUrl && (
                          <a href={settings.instagramUrl} target="_blank" rel="noopener noreferrer" className="text-brand-text/60 hover:text-[#E4405F] transition-colors" title="Instagram"><FaInstagram className="w-4 h-4" /></a>
                        )}
                        {settings.facebookUrl && (
                          <a href={settings.facebookUrl} target="_blank" rel="noopener noreferrer" className="text-brand-text/60 hover:text-[#1877F2] transition-colors" title="Facebook"><FaFacebook className="w-4 h-4" /></a>
                        )}
                        {settings.snapchatUrl && (
                          <a href={settings.snapchatUrl} target="_blank" rel="noopener noreferrer" className="text-brand-text/60 hover:text-[#FFFC00] transition-colors" title="Snapchat"><FaSnapchat className="w-4 h-4" /></a>
                        )}
                        {settings.tiktokUrl && (
                          <a href={settings.tiktokUrl} target="_blank" rel="noopener noreferrer" className="text-brand-text/60 hover:text-[#000000] transition-colors" title="TikTok"><FaTiktok className="w-4 h-4" /></a>
                        )}
                        {settings.googleBusinessUrl && (
                          <a href={settings.googleBusinessUrl} target="_blank" rel="noopener noreferrer" className="text-brand-text/60 hover:text-[#EA4335] transition-colors" title="Google Business"><FaGoogle className="w-4 h-4" /></a>
                        )}
                      </div>
                    ) : (
                      <div className="font-black text-xs text-brand-text break-all">{item.value}</div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="glass p-8 rounded-2xl border border-white/10 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <Send className="w-32 h-32 text-primary" />
              </div>
              <h3 className="text-2xl font-black mb-4 uppercase tracking-widest text-brand-text">Quick Support</h3>
              <p className="text-brand-text/60 text-sm mb-8 max-w-md">
                For urgent matters, please connect with us directly on WhatsApp for real-time assistance from our support team.
              </p>
              <a 
                href={waLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block bg-[#25D366] text-white px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest border-b-4 border-[#128C7E] shadow-lg shadow-[#25D366]/20 hover:scale-105 active:scale-95 transition-all"
              >
                Connect on WhatsApp
              </a>
            </div>
          </div>

          {/* Contact Form */}
          <motion.div 
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass p-10 rounded-[2rem] border border-white/10"
          >
            <form className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-brand-text/40 ml-2">Full Name</label>
                  <input type="text" placeholder="John Doe" className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 focus:outline-none focus:border-primary/50 transition-colors text-brand-text" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-brand-text/40 ml-2">Email Address</label>
                  <input type="email" placeholder="john@example.com" className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 focus:outline-none focus:border-primary/50 transition-colors text-brand-text" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-brand-text/40 ml-2">Subject</label>
                <input type="text" placeholder="How can we help?" className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 focus:outline-none focus:border-primary/50 transition-colors text-brand-text" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-brand-text/40 ml-2">Message</label>
                <textarea rows={5} placeholder="Tell us more about your inquiry..." className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 focus:outline-none focus:border-primary/50 transition-colors resize-none text-brand-text"></textarea>
              </div>
              <button className="w-full bg-primary text-white py-5 rounded-2xl font-black uppercase tracking-widest border-b-2 border-accent hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3">
                Send Message <Send className="w-5 h-5" />
              </button>
            </form>
          </motion.div>
        </div>
      </div>
    </main>
  );
};

export default ContactPage;
