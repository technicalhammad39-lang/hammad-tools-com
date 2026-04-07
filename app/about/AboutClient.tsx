'use client';

import React from 'react';
import { motion } from 'motion/react';
import { Shield, Sparkles, Send, Globe, Users, Award, PlaySquare, Store, Ghost, Music } from 'lucide-react';
import { FaFacebook, FaInstagram, FaWhatsapp, FaTiktok, FaSnapchat, FaYoutube, FaGoogle } from 'react-icons/fa6';
import Image from 'next/image';
import { useSettings } from '@/context/SettingsContext';

export default function AboutClient() {
  const { settings } = useSettings();
  return (
    <div className="min-h-screen bg-brand-bg text-brand-text pt-32 pb-24 overflow-hidden relative">
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header Section */}
        <div className="text-center mb-12 md:mb-24">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-0 md:gap-2 mb-6 md:mb-10"
          >
            <span className="text-2xl sm:text-3xl md:text-6xl font-serif italic text-white normal-case leading-tight">Welcome to</span> 
            <span 
              style={{ fontFamily: 'var(--font-display)' }}
              className="text-[2.5rem] sm:text-5xl md:text-9xl font-bold uppercase internal-gradient whitespace-nowrap leading-none mt-1 md:mt-0"
            >
              Hammad Tools
            </span>
          </motion.div>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-brand-text/50 font-medium max-w-2xl mx-auto leading-relaxed md:text-lg px-4 mt-2 md:mt-0"
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
            <div className="glass p-6 md:p-10 rounded-[2.5rem] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl relative overflow-hidden bg-white/5">
               <div className="absolute top-0 left-0 w-2 h-full bg-primary"></div>
               <Shield className="w-8 h-8 md:w-12 md:h-12 text-primary mb-6" />
               <h2 className="text-2xl md:text-4xl font-black uppercase text-white mb-4">Our Mission & Vision</h2>
               <div className="space-y-4 text-brand-text/70 font-medium leading-relaxed text-sm md:text-base">
                  <p>
                    "Our vision is simple: democratize access to elite digital resources. We empower creators by removing the barriers of fragmented subscriptions and high costs."
                  </p>
                  <p className="hidden md:block">
                    "Today, we stand as the central hub for thousands of professionals globally. We merge hyper-support with flawlessly secure infrastructure."
                  </p>
                  <p className="text-primary font-bold text-xs md:text-sm">
                    - Hammad Tools Team
                  </p>
               </div>
            </div>
          </motion.div>

          {/* Vision/Stats Block */}
          <motion.div 
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="grid grid-cols-2 lg:grid-cols-2 gap-4 md:gap-6"
          >
            <div className="p-5 md:p-8 rounded-3xl border border-white/10 shadow-2xl flex flex-col items-center justify-center text-center bg-white/5">
              <div className="w-10 h-10 md:w-16 md:h-16 rounded-full bg-white/10 flex items-center justify-center mb-4">
                <Globe className="w-5 h-5 md:w-8 md:h-8 text-white" />
              </div>
              <h3 className="text-2xl md:text-4xl font-black text-white">50+</h3>
              <p className="text-[8px] md:text-[10px] uppercase font-black tracking-widest text-white/60 mt-1">Countries Served</p>
            </div>
            <div className="p-5 md:p-8 rounded-3xl border border-primary/30 shadow-2xl flex flex-col items-center justify-center text-center bg-primary">
              <div className="w-10 h-10 md:w-16 md:h-16 rounded-full bg-black/15 flex items-center justify-center mb-4">
                <Users className="w-5 h-5 md:w-8 md:h-8 text-black" />
              </div>
              <h3 className="text-2xl md:text-4xl font-black text-black">10k+</h3>
              <p className="text-[8px] md:text-[10px] uppercase font-black tracking-widest text-black/70 mt-1">Active Creators</p>
            </div>
            <div className="p-5 md:p-8 rounded-3xl border border-white/10 shadow-2xl flex flex-col items-center justify-center text-center bg-white/5">
              <div className="w-10 h-10 md:w-16 md:h-16 rounded-full bg-white/10 flex items-center justify-center mb-4">
                <Award className="w-5 h-5 md:w-8 md:h-8 text-white" />
              </div>
              <h3 className="text-2xl md:text-4xl font-black text-white">99%</h3>
              <p className="text-[8px] md:text-[10px] uppercase font-black tracking-widest text-white/60 mt-1">Satisfaction Rate</p>
            </div>
            <div className="p-5 md:p-8 rounded-3xl border border-primary/30 shadow-2xl flex flex-col items-center justify-center text-center bg-primary">
              <div className="w-10 h-10 md:w-16 md:h-16 rounded-full bg-black/15 flex items-center justify-center mb-4">
                <Shield className="w-5 h-5 md:w-8 md:h-8 text-black" />
              </div>
              <h3 className="text-2xl md:text-4xl font-black text-black">24/7</h3>
              <p className="text-[8px] md:text-[10px] uppercase font-black tracking-widest text-black/70 mt-1">Security & Support</p>
            </div>
          </motion.div>
        </div>

        {/* Oversized Interactive Social Links */}
        <div className="text-center mb-10">
          <h2 className="text-2xl font-black uppercase text-brand-text mb-10 tracking-widest">Connect with our Ecosystem</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {[
                { title: "Facebook", subtitle: "Join our community", url: settings.facebookUrl, icon: FaFacebook, colorTheme: "blue" },
                { title: "Instagram", subtitle: "Follow our Journey", url: settings.instagramUrl, icon: FaInstagram, colorTheme: "accent" },
                { title: "Google Business", subtitle: "Reviews & Ratings", url: settings.googleBusinessUrl, icon: FaGoogle, colorTheme: "primary" },
                { title: "WhatsApp", subtitle: "Daily Updates", url: settings.whatsappUrl, icon: FaWhatsapp, colorTheme: "emerald" },
                { title: "Snapchat", subtitle: "Behind the Scenes", url: settings.snapchatUrl, icon: FaSnapchat, colorTheme: "blue" },
                { title: "TikTok", subtitle: "Short Tutorials", url: settings.tiktokUrl, icon: FaTiktok, colorTheme: "accent" },
             ].filter(link => link.url && link.url !== '#').map((link, idx) => {
               const styles: Record<string, { border: string, shadow: string, bg: string, text: string }> = {
                 blue: { border: "border-blue-500/20", shadow: "shadow-[0_10px_30px_rgba(59,130,246,0.1)] hover:shadow-[0_20px_40px_rgba(59,130,246,0.2)]", bg: "from-blue-500/10 to-transparent", text: "text-blue-400" },
                 accent: { border: "border-accent/20", shadow: "shadow-[0_10px_30px_rgba(255,51,102,0.1)] hover:shadow-[0_20px_40px_rgba(255,51,102,0.2)]", bg: "from-accent/10 to-transparent", text: "text-accent" },
                 emerald: { border: "border-emerald-500/20", shadow: "shadow-[0_10px_30px_rgba(16,185,129,0.1)] hover:shadow-[0_20px_40px_rgba(16,185,129,0.2)]", bg: "from-emerald-500/10 to-transparent", text: "text-emerald-400" },
                 primary: { border: "border-primary/20", shadow: "shadow-[0_10px_30px_rgba(255,234,0,0.1)] hover:shadow-[0_20px_40px_rgba(255,234,0,0.2)]", bg: "from-primary/10 to-transparent", text: "text-primary" },
               };
               const theme = styles[link.colorTheme];
               return (
                 <motion.a 
                  key={idx}
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`relative overflow-hidden group glass p-6 md:p-10 rounded-[2.5rem] border ${theme.border} ${theme.shadow} transition-all flex flex-col items-center text-center`}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${theme.bg} opacity-0 group-hover:opacity-100 transition-opacity`}></div>
                  <link.icon className={`w-12 h-12 md:w-20 md:h-20 ${theme.text} mb-4 md:mb-6 group-hover:scale-110 transition-transform duration-500`} />
                  <h3 className="text-lg md:text-xl font-black uppercase tracking-widest text-brand-text mb-1 md:mb-2">{link.title}</h3>
                  <p className="text-[10px] md:text-xs font-bold text-brand-text/50 uppercase">{link.subtitle}</p>
                </motion.a>
               );
             })}
          </div>
        </div>

      </div>
    </div>
  );
}
