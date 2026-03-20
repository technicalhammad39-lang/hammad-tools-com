'use client';

import React from 'react';
import { motion } from 'motion/react';
import { Mail, MessageSquare, Send, MapPin, Phone, Globe } from 'lucide-react';

const ContactPage = () => {
  return (
    <main className="min-h-screen pt-20 md:pt-24 pb-20 px-4 bg-brand-bg">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 md:mb-12">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-7xl lg:text-8xl font-black uppercase tracking-tighter mb-4 text-brand-text md:whitespace-nowrap"
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Contact Info */}
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { label: 'Email Us', value: 'hammadkhaksar56@gmail.com', icon: Mail, color: 'text-primary' },
                { label: 'Live Chat', value: 'Available 24/7', icon: MessageSquare, color: 'text-primary' },
                { label: 'Location', value: 'Digital Space, Global', icon: MapPin, color: 'text-primary' },
                { label: 'Socials', value: '@hammadtools_pro', icon: Globe, color: 'text-primary' },
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
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-brand-text/40">{item.label}</div>
                    <div className="font-black text-xs text-brand-text break-all">{item.value}</div>
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
                For urgent matters, please join our Discord community for real-time assistance from our moderators and community members.
              </p>
              <button className="bg-primary text-white px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest border-b-2 border-accent hover:scale-105 transition-transform">
                Join Discord
              </button>
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
