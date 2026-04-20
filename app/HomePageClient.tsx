'use client';

import React from 'react';
import Hero from '@/components/Hero';
import ServicesSection from '@/components/ServicesSection';
import GoogleBusinessReviews from '@/components/GoogleBusinessReviews';
import PartnerSection from '@/components/PartnerSection';
import Testimonials from '@/components/Testimonials';
import { motion } from 'motion/react';
import { Users, Globe, Award, Heart, Zap, Shield, Headphones, Layers, HelpCircle } from 'lucide-react';
import Marquee from 'react-fast-marquee';

const stats = [
  { label: 'Active Users', value: '10K+', icon: <Users className="w-5 h-5" /> },
  { label: 'Services', value: '50+', icon: <Globe className="w-5 h-5" /> },
  { label: 'Awards Won', value: '12', icon: <Award className="w-5 h-5" /> },
  { label: 'Happy Clients', value: '99%', icon: <Heart className="w-5 h-5" /> },
  { label: 'Fast Delivery', value: 'Instant', icon: <Zap className="w-5 h-5" /> },
  { label: 'Support', value: '24/7', icon: <Headphones className="w-5 h-5" /> },
];

export default function Home() {
  return (
    <div className="relative bg-brand-bg">
      <Hero />
      
      {/* Logo Marquee Section */}
      <section className="py-5 md:py-10 border-y border-white/5 bg-black/40 backdrop-blur-xl relative z-10">
        <Marquee gradient={true} gradientColor="black" gradientWidth={100} speed={40} pauseOnHover={true}>
          {[
            { name: 'Netflix', color: '#E50914' },
            { name: 'Spotify', color: '#1DB954' },
            { name: 'Canva', color: '#00C4CC' },
            { name: 'ChatGPT', color: '#10a37f' },
            { name: 'YouTube', color: '#FF0000' },
            { name: 'Disney+', color: '#006E99' },
            { name: 'Amazon Prime', color: '#00A8E1' },
            { name: 'Crunchyroll', color: '#F47521' },
          ].map((platform) => (
            <div key={platform.name} className="flex items-center space-x-1.5 md:space-x-3 mx-5 md:mx-14 group">
              <div 
                className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full" 
                style={{ backgroundColor: platform.color }}
              />
              <span className="text-base sm:text-xl md:text-2xl font-black text-brand-text/40 group-hover:text-brand-text transition-colors duration-300 uppercase italic">
                {platform.name}
              </span>
            </div>
          ))}
        </Marquee>
      </section>

      <ServicesSection />
      
      {/* Why Choose Us Section - Premium Cards */}
      <section className="py-16 md:py-32 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-primary/5 -z-10" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-5xl md:text-7xl font-black mb-6 text-brand-text uppercase"
            >
              <span className="font-serif italic text-white normal-case">Why</span> Choose <span className="internal-gradient">Us</span>?
            </motion.h2>
            <p className="text-brand-text/60 text-xs max-w-2xl mx-auto font-black uppercase tracking-widest">Experience the best subscription platform with premium features and elite security.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {[
              {
                title: "Instant Delivery",
                desc: "Get your credentials within seconds of purchase.",
                icon: <Zap className="w-5 h-5 md:w-8 md:h-8" />,
                color: "#FFD600"
              },
              {
                title: "24/7 Support",
                desc: "Available around the clock to assist you.",
                icon: <Headphones className="w-5 h-5 md:w-8 md:h-8" />,
                color: "#FF8C2A"
              },
              {
                title: "Secure Access",
                desc: "Encryption to protect your data and transactions.",
                icon: <Shield className="w-5 h-5 md:w-8 md:h-8" />,
                color: "#FFA94D"
              },
              {
                title: "Premium Quality",
                desc: "High-quality, stable accounts with full warranty.",
                icon: <Award className="w-5 h-5 md:w-8 md:h-8" />,
                color: "#FFD600"
              },
              {
                title: "Elite Dashboard",
                desc: "Manage everything in one high-performance dashboard.",
                icon: <Layers className="w-5 h-5 md:w-8 md:h-8" />,
                color: "#FF8C2A"
              },
              {
                title: "Global Reach",
                desc: "Our services work worldwide. Access from anywhere.",
                icon: <Globe className="w-5 h-5 md:w-8 md:h-8" />,
                color: "#FFA94D"
              }
            ].map((feature, index) => {
              const isWhiteCard = index % 2 === 0;
              return (
              <motion.div
                key={feature.title}
                initial={typeof window !== 'undefined' && window.innerWidth < 768 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={typeof window !== 'undefined' && window.innerWidth >= 768 ? { 
                  y: -10, 
                  rotateX: 10, 
                  rotateY: -5,
                  transition: { duration: 0.3 }
                } : {}}
                className={`rounded-2xl md:rounded-[2rem] p-4 md:p-10 border border-white/40 group relative overflow-hidden transition-all duration-500 perspective-1000 flex flex-row items-center md:items-start md:flex-col gap-4 md:gap-0 shadow-[0_20px_50px_rgba(255,214,0,0.18)] ${
                  isWhiteCard
                    ? 'bg-[linear-gradient(135deg,#FFFFFF_0%,#FFF9E6_55%,#FFFFFF_100%)]'
                    : 'bg-[linear-gradient(135deg,#FFFBEA_0%,#FFD600_48%,#FFF6CC_100%)]'
                }`}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                
                <div
                  className="shrink-0 flex items-center justify-center mb-0 md:mb-6 transition-all animate-float"
                  style={{ color: feature.color }}
                >
                  {feature.icon}
                </div>
                <div className="flex flex-col">
                  <h3 className="text-base sm:text-lg md:text-2xl font-black mb-1 md:mb-4 text-[#1A1A1A] uppercase">{feature.title}</h3>
                  <p className="text-[#1A1A1A]/70 leading-relaxed font-medium text-[11px] sm:text-xs md:text-sm">{feature.desc}</p>
                </div>
              </motion.div>
            );
            })}
          </div>
        </div>
      </section>

      <GoogleBusinessReviews />

      <PartnerSection />

      <Testimonials />

      {/* FAQ Section with Animated Icons */}
      <section className="py-20 md:py-40 relative overflow-hidden">
        {/* Large Background Question Marks */}
        <motion.div 
          animate={{ 
            y: [0, -60, 0],
            rotate: [15, 25, 15],
            scale: [1, 1.1, 1]
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -left-32 top-0 opacity-[0.05] -z-10 pointer-events-none"
        >
          <HelpCircle className="w-[800px] h-[800px] text-primary" strokeWidth={0.5} />
        </motion.div>
        
        <motion.div 
          animate={{ 
            y: [0, 60, 0],
            rotate: [-15, -25, -15],
            scale: [1, 1.1, 1]
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute -right-32 bottom-0 opacity-[0.05] -z-10 pointer-events-none"
        >
          <HelpCircle className="w-[800px] h-[800px] text-secondary" strokeWidth={0.5} />
        </motion.div>

        {/* Extra floating icons for detail */}
        <motion.div 
          animate={{ 
            y: [0, -30, 0],
            x: [0, 20, 0],
            rotate: [0, 360]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute left-[10%] bottom-[20%] opacity-[0.1] -z-10"
        >
          <HelpCircle className="w-24 h-24 text-primary" strokeWidth={1} />
        </motion.div>

        <motion.div 
          animate={{ 
            y: [0, 30, 0],
            x: [0, -20, 0],
            rotate: [360, 0]
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute right-[10%] top-[20%] opacity-[0.1] -z-10"
        >
          <HelpCircle className="w-32 h-32 text-secondary" strokeWidth={1} />
        </motion.div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-5xl md:text-7xl font-black mb-4 text-brand-text uppercase">Got <span className="internal-gradient">Questions</span>?</h2>
              <p className="text-brand-text/40 font-black uppercase tracking-widest text-[10px]">Everything you need to know about Hammad Tools.</p>
            </div>
            <div className="space-y-6">
              {[
                { q: "How do I receive my subscription?", a: "After payment proof verification, your credentials are delivered inside your dashboard and linked to your account automatically." },
                { q: "Are these subscriptions legal?", a: "Yes, we provide legitimate access to premium services through official channels and bulk enterprise accounts." },
                { q: "What if my account stops working?", a: "We offer a full warranty on all our services. If any issue arises, open a support request and our team will fix or replace access after review." },
                { q: "Can I cancel my subscription?", a: "Yes, you can cancel your monthly plans at any time from your dashboard settings." },
                { q: "What payment methods do you accept?", a: "Checkout shows all active payment methods configured by admin, including wallet, bank, and transfer options with live account details." }
              ].map((item, i) => (
                <details key={i} className="glass rounded-3xl border border-white/5 group overflow-hidden transition-all duration-500">
                  <summary className="p-8 cursor-pointer font-black text-sm uppercase flex justify-between items-center list-none hover:bg-white/5 transition-colors text-brand-text">
                    <span>{item.q}</span>
                    <span className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary transition-transform duration-500 group-open:rotate-180 border border-primary/20">
                      <Zap className="w-4 h-4" />
                    </span>
                  </summary>
                  <div className="px-8 pb-8 text-brand-text/50 border-t border-white/5 pt-6 font-medium leading-relaxed text-sm">
                    {item.a}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

