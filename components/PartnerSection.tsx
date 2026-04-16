'use client';

import React from 'react';
import { motion } from 'motion/react';
import Image from 'next/image';
import { ExternalLink, Globe, Zap, Crown } from 'lucide-react';
import { useSettings } from '@/context/SettingsContext';

const PartnerSection = () => {
  const { settings } = useSettings();
  
  const partners = [
    {
      name: 'DailyHayat',
      desc: 'Premier network for digital trends and global news updates.',
      url: 'https://dailyhayat.net',
      logo: '/dailyhayat.png',
      tag: 'Strategic Partner'
    },
    {
      name: 'Khaksar Agency',
      desc: 'Leading digital solutions and premium service scaling for local markets.',
      url: settings.whatsappUrl,
      logo: '/khaksar-crown', 
      tag: 'Digital Partner'
    }
  ];

  return (
    <section className="py-14 md:py-20 relative overflow-hidden bg-brand-bg">
    {/* Reduce top spacing fix */}
      <div className="-mt-12" />
      {/* Background Decorative Elements */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary/5 blur-[100px] rounded-full -z-10" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-secondary/5 blur-[100px] rounded-full -z-10" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16 md:mb-20">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-[40px] sm:text-6xl md:text-7xl font-black uppercase text-brand-text mb-6 flex flex-col md:block"
          >
            <span className="font-serif italic text-white normal-case md:inline">Trusted </span>
            <span className="internal-gradient md:inline">Partners</span>
          </motion.h2>
          <p className="text-brand-text/40 text-sm font-black uppercase tracking-widest max-w-xl mx-auto">Verified partners empowering the Hammad Tools platform.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 max-w-6xl mx-auto">
          {partners.map((partner, index) => (
            <motion.div
              key={partner.name}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -10 }}
              className="group relative"
            >
              <a 
                href={partner.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="block h-full p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] border border-white/60 transition-all duration-500 overflow-hidden bg-[linear-gradient(135deg,#FFFFFF_0%,#FFF9E6_55%,#FFFFFF_100%)] group-hover:bg-[linear-gradient(135deg,#FFF7D6_0%,#FFE27A_55%,#FFF7D6_100%)] shadow-[0_20px_50px_rgba(255,214,0,0.18)] group-hover:shadow-[0_28px_70px_rgba(255,214,0,0.25)] flex flex-col"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                
                <div className="flex items-start justify-between gap-4">
                  <div className="w-[68px] h-[68px] md:w-[88px] md:h-[88px] rounded-2xl bg-white/80 flex items-center justify-center border border-black/10 group-hover:scale-105 transition-transform overflow-hidden relative">
                    {partner.name === 'Khaksar Agency' ? (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-white to-[#FFF3C4]">
                        <Crown className="w-10 h-10 text-[#1A1A1A] drop-shadow-[0_8px_16px_rgba(0,0,0,0.15)]" />
                      </div>
                    ) : (
                      <Image
                        src={partner.logo}
                        alt={partner.name}
                        fill
                        className="object-contain object-center p-2.5"
                      />
                    )}
                  </div>
                  <div className="px-4 py-1.5 rounded-full bg-black/5 border border-black/10 text-[8px] font-black uppercase text-[#1A1A1A] tracking-widest">
                    {partner.tag}
                  </div>
                </div>

                <div className="mt-8 flex-1">
                  <h3 className="text-2xl font-black text-[#1A1A1A] uppercase mb-3 flex items-center gap-3">
                    {partner.name}
                    <ExternalLink className="w-4 h-4 text-[#1A1A1A]/30 group-hover:text-[#1A1A1A] transition-colors" />
                  </h3>
                  <p className="text-[#1A1A1A]/60 text-sm font-medium leading-relaxed">
                    {partner.desc}
                  </p>
                </div>

                <div className="mt-8 pt-6 border-t border-black/10 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-[#1A1A1A]/60">
                    <Globe className="w-4 h-4 text-[#1A1A1A]/40" />
                    Verified Partner
                  </div>
                  <Zap className="w-5 h-5 text-primary opacity-60 group-hover:opacity-100 transition-opacity" />
                </div>
              </a>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PartnerSection;
