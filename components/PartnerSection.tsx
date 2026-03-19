'use client';

import React from 'react';
import { motion } from 'motion/react';
import Image from 'next/image';
import { ExternalLink, Globe, ShieldCheck, Zap, Globe2 } from 'lucide-react';

const partners = [
  {
    name: 'DailyHayat',
    desc: 'Premier intelligence network for digital trends and global news updates.',
    url: 'https://dailyhayat.net',
    logo: 'https://dailyhayat.net/wp-content/uploads/2023/10/daily-hayat-logo.png',
    tag: 'Strategic Partner'
  },
  {
    name: 'SubHammad',
    desc: 'Advanced subscription logistics and enterprise-grade tool access.',
    url: '#',
    logo: '/logo.png',
    tag: 'Core Division'
  },
  {
    name: 'Hammad Tech',
    desc: 'Infrastructure management and cyber-security protocol development.',
    url: '#',
    logo: '/logo.png',
    tag: 'In-House'
  }
];

const PartnerSection = () => {
  return (
    <section className="py-32 relative overflow-hidden bg-brand-bg">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary/5 blur-[100px] rounded-full -z-10" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-secondary/5 blur-[100px] rounded-full -z-10" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-24">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-[0.3em] text-brand-text/40 mb-8"
          >
            <Globe2 className="w-3 h-3 text-primary" />
            Strategic Ecosystem
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-5xl md:text-7xl font-black uppercase tracking-tighter text-brand-text mb-6"
          >
            Our Tactical <span className="internal-gradient">Allies</span>
          </motion.h2>
          <p className="text-brand-text/40 text-sm font-black uppercase tracking-widest max-w-xl mx-auto">Verified partners empowering the Hammad Tools protocol.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {partners.map((partner, index) => (
            <motion.div
              key={partner.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -10 }}
              className="group relative"
            >
              <a 
                href={partner.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="block h-full glass p-10 rounded-[3rem] border border-white/5 hover:border-primary/40 transition-all duration-500 bg-brand-soft/5 overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                
                <div className="flex justify-between items-start mb-12">
                   <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center p-4 border border-white/10 group-hover:scale-110 transition-transform">
                      <Image
                        src={partner.logo}
                        alt={partner.name}
                        width={80}
                        height={80}
                        className="object-contain"
                      />
                   </div>
                   <div className="px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-[8px] font-black uppercase text-primary tracking-widest">
                      {partner.tag}
                   </div>
                </div>

                <h3 className="text-2xl font-black text-brand-text uppercase tracking-tighter mb-4 flex items-center gap-3">
                   {partner.name}
                   <ExternalLink className="w-4 h-4 text-brand-text/10 group-hover:text-primary transition-colors" />
                </h3>
                <p className="text-brand-text/40 text-sm font-medium leading-relaxed mb-10">
                   {partner.desc}
                </p>

                <div className="pt-8 border-t border-white/5 flex items-center justify-between">
                   <div className="flex items-center gap-2">
                      <div className="flex -space-x-2">
                         {[1, 2, 3].map(i => (
                           <div key={i} className="w-6 h-6 rounded-full border-2 border-brand-bg bg-white/10 font-black text-[6px] flex items-center justify-center">
                              {i}
                           </div>
                         ))}
                      </div>
                      <span className="text-[10px] font-black text-brand-text/20 uppercase">Trust Index Baseline</span>
                   </div>
                   <Zap className="w-5 h-5 text-primary opacity-20 group-hover:opacity-100 transition-opacity" />
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
