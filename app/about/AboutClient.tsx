'use client';

import React from 'react';
import { motion } from 'motion/react';
import { Shield, Sparkles, Send, Globe, Users, Award, PlaySquare, MessageCircle } from 'lucide-react';
import Image from 'next/image';

export default function AboutClient() {
  return (
    <div className="min-h-screen bg-brand-bg text-brand-text pt-32 pb-24 overflow-hidden relative">
      {/* Background Glows for 3D Depth */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-primary/20 blur-[120px] rounded-full mix-blend-screen pointer-events-none -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-secondary/10 blur-[150px] rounded-full mix-blend-screen pointer-events-none translate-x-1/3 translate-y-1/3" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header Section */}
        <div className="text-center mb-24">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-primary/20 text-primary uppercase font-black tracking-widest text-[10px] mb-8 shadow-xl shadow-primary/10"
          >
            <Sparkles className="w-4 h-4" />
            Empowering Digital Creators
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-8xl font-black uppercase tracking-tight mb-6"
          >
            Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-emerald-400 drop-shadow-[0_0_15px_rgba(0,255,163,0.5)]">Hammad Tools</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-brand-text/50 font-medium max-w-2xl mx-auto leading-relaxed md:text-lg"
          >
            We don't just provide access; we build bridges to premium digital ecosystems. 
            Experience unparalleled speed, security, and global support.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center mb-32">
          {/* CEO Message Block */}
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="relative"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent blur-3xl -z-10 rounded-[3rem]"></div>
            <div className="glass p-10 md:p-14 rounded-[3rem] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl relative overflow-hidden">
               <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-primary to-emerald-500"></div>
               <Shield className="w-12 h-12 text-primary mb-8" />
               <h2 className="text-3xl md:text-4xl font-black uppercase text-brand-text mb-6">CEO Message</h2>
               <div className="space-y-4 text-brand-text/70 font-medium leading-relaxed">
                  <p>
                    "When I founded Hammad Tools, the vision was simple: democratize access to elite digital resources. I saw countless creators struggling with fragmented subscriptions and high costs."
                  </p>
                  <p>
                    "Today, we stand as the central hub for thousands of professionals globally. We are obsessed with pushing the boundaries of what a service platform can be—merging 24/7 hyper-support with flawlessly secure infrastructure."
                  </p>
                  <p className="text-primary font-bold">
                    - Hammad Khaksar, Founder & CEO
                  </p>
               </div>
            </div>
          </motion.div>

          {/* Vision/Stats Block */}
          <motion.div 
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-6"
          >
            <div className="glass p-8 rounded-3xl border border-white/5 shadow-2xl hover:border-primary/30 transition-all hover:-translate-y-2 flex flex-col items-center justify-center text-center group">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-[0_0_20px_rgba(0,255,163,0.2)]">
                <Globe className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-4xl font-black text-brand-text">50+</h3>
              <p className="text-[10px] uppercase font-black tracking-widest text-brand-text/40 mt-2">Countries Served</p>
            </div>
            <div className="glass p-8 rounded-3xl border border-white/5 shadow-2xl hover:border-emerald-500/30 transition-all hover:-translate-y-2 flex flex-col items-center justify-center text-center group translate-y-0 sm:translate-y-10">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                <Users className="w-8 h-8 text-emerald-400" />
              </div>
              <h3 className="text-4xl font-black text-brand-text">10k+</h3>
              <p className="text-[10px] uppercase font-black tracking-widest text-brand-text/40 mt-2">Active Creators</p>
            </div>
            <div className="glass p-8 rounded-3xl border border-white/5 shadow-2xl hover:border-accent/30 transition-all hover:-translate-y-2 flex flex-col items-center justify-center text-center group">
              <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-[0_0_20px_rgba(255,51,102,0.2)]">
                <Award className="w-8 h-8 text-accent" />
              </div>
              <h3 className="text-4xl font-black text-brand-text">99%</h3>
              <p className="text-[10px] uppercase font-black tracking-widest text-brand-text/40 mt-2">Satisfaction Rate</p>
            </div>
            <div className="glass p-8 rounded-3xl border border-white/5 shadow-2xl hover:border-blue-500/30 transition-all hover:-translate-y-2 flex flex-col items-center justify-center text-center group translate-y-0 sm:translate-y-10">
              <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-[0_0_20px_rgba(59,130,246,0.2)]">
                <Shield className="w-8 h-8 text-blue-400" />
              </div>
              <h3 className="text-4xl font-black text-brand-text">24/7</h3>
              <p className="text-[10px] uppercase font-black tracking-widest text-brand-text/40 mt-2">Security & Support</p>
            </div>
          </motion.div>
        </div>

        {/* Oversized Interactive Social Links */}
        <div className="text-center mb-10">
          <h2 className="text-2xl font-black uppercase text-brand-text mb-10 tracking-widest">Connect with our Ecosystem</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <motion.a 
              href="https://wa.me/923209310656"
              target="_blank"
              rel="noreferrer"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="relative overflow-hidden group glass p-10 rounded-[2.5rem] border border-emerald-500/20 shadow-[0_10px_30px_rgba(16,185,129,0.1)] hover:shadow-[0_20px_40px_rgba(16,185,129,0.3)] transition-all flex flex-col items-center text-center"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <MessageCircle className="w-20 h-20 text-emerald-400 mb-6 drop-shadow-[0_0_10px_rgba(16,185,129,0.5)] group-hover:scale-110 transition-transform duration-500" />
              <h3 className="text-xl font-black uppercase tracking-widest text-brand-text mb-2">WhatsApp</h3>
              <p className="text-xs font-bold text-brand-text/50 uppercase">Instant 24/7 Support</p>
            </motion.a>

            <motion.a 
              href="https://t.me/hammad_tools"
              target="_blank"
              rel="noreferrer"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="relative overflow-hidden group glass p-10 rounded-[2.5rem] border border-blue-500/20 shadow-[0_10px_30px_rgba(59,130,246,0.1)] hover:shadow-[0_20px_40px_rgba(59,130,246,0.3)] transition-all flex flex-col items-center text-center"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <Send className="w-20 h-20 text-blue-400 mb-6 drop-shadow-[0_0_10px_rgba(59,130,246,0.5)] group-hover:scale-110 transition-transform duration-500" />
              <h3 className="text-xl font-black uppercase tracking-widest text-brand-text mb-2">Telegram Channel</h3>
              <p className="text-xs font-bold text-brand-text/50 uppercase">Exclusive Updates</p>
            </motion.a>

            <motion.a 
              href="https://youtube.com/@hammadtools"
              target="_blank"
              rel="noreferrer"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="relative overflow-hidden group glass p-10 rounded-[2.5rem] border border-accent/20 shadow-[0_10px_30px_rgba(255,51,102,0.1)] hover:shadow-[0_20px_40px_rgba(255,51,102,0.3)] transition-all flex flex-col items-center text-center"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-accent/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <PlaySquare className="w-20 h-20 text-accent mb-6 drop-shadow-[0_0_10px_rgba(255,51,102,0.5)] group-hover:scale-110 transition-transform duration-500" />
              <h3 className="text-xl font-black uppercase tracking-widest text-brand-text mb-2">YouTube</h3>
              <p className="text-xs font-bold text-brand-text/50 uppercase">Tutorials & Guides</p>
            </motion.a>
          </div>
        </div>

      </div>
    </div>
  );
}
