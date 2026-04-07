'use client';

import React from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Play, Star, MousePointer2, Quote } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import Typewriter from 'typewriter-effect';

const Hero = () => {
  return (
    <section className="relative min-h-[100dvh] md:min-h-[60dvh] md:max-h-[700px] lg:min-h-[100dvh] lg:max-h-none flex flex-col items-center justify-center pt-20 lg:pt-28 overflow-hidden w-full">
      {/* Background Layer */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-25"
        >
          <source src="/web-background.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-black/50" />
        <div className="absolute inset-0 cyber-grid opacity-[0.1]" />
        
        {/* Decorative Gradients */}
        <div className="absolute top-[10%] left-[10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[10%] right-[10%] w-[40%] h-[40%] bg-accent/5 rounded-full blur-[120px]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="md:w-full md:max-w-4xl md:mx-auto md:flex md:flex-col md:items-center md:text-center lg:items-start lg:text-left lg:mx-0"
          >
            <h1 className="text-5xl sm:text-6xl md:text-8xl lg:text-8xl font-black leading-[1.1] md:leading-[1] mb-4 md:mb-6 text-brand-text flex flex-col items-start md:items-center lg:items-start gap-2 md:gap-4 text-left md:text-center lg:text-left transition-all">
              <span className="text-5xl sm:text-6xl md:text-8xl lg:text-8xl font-serif italic text-white leading-tight whitespace-nowrap">Unlock The</span>
              <span style={{ fontFamily: 'var(--font-display)' }} className="text-5xl sm:text-7xl md:text-8xl lg:text-8xl font-bold bg-gradient-to-b from-[#FFEA00] to-[#FF9500] bg-clip-text text-transparent uppercase leading-none mt-1 sm:mt-2 md:mt-0 whitespace-nowrap">
                <Typewriter
                  options={{
                    strings: ['PRO COURSES', 'PREMIUM TOOLS', 'DIGITAL ASSETS'],
                    autoStart: true,
                    loop: true,
                    delay: 50,
                    deleteSpeed: 30,
                    cursor: '|',
                  }}
                />
              </span>
            </h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="text-base md:text-2xl text-gray-400 md:text-brand-text/60 mt-2 md:mt-3 mb-4 md:mb-6 max-w-lg md:max-w-3xl leading-relaxed font-medium relative z-20 text-left md:text-center lg:text-left mx-0 md:mx-auto lg:mx-0"
            >
              Access Netflix, ChatGPT Plus, Canva Pro, and 50+ other premium content access at unbeatable prices. Fast, secure, and reliable.
            </motion.p>

            <div className="flex flex-col md:flex-row gap-4 md:gap-6 justify-start md:justify-center lg:justify-start w-full md:w-auto">
              <Link href="/tools" className="w-full md:w-auto">
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full md:w-auto bg-primary text-brand-bg px-8 md:px-12 py-4 md:py-6 rounded-xl font-black flex items-center justify-center space-x-3 transition-all border-b-4 border-[#FF8C2A] shadow-xl shadow-primary/10"
                >
                  <span className="text-sm md:text-xl whitespace-nowrap">Explore Tools</span>
                  <ArrowRight className="w-5 h-5 md:w-7 md:h-7" />
                </motion.button>
              </Link>
              <Link href="/about" className="w-full md:w-auto">
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full md:w-auto glass hover:bg-white/10 text-white px-8 md:px-12 py-4 md:py-6 rounded-xl font-bold flex items-center justify-center space-x-3 transition-all border border-white/20"
                >
                  <Play className="w-5 h-5 md:w-7 md:h-7 fill-current" />
                  <span className="text-sm md:text-xl whitespace-nowrap">How it Works</span>
                </motion.button>
              </Link>
            </div>

            <div className="mt-4 md:mt-6 flex flex-row items-center justify-start md:justify-center lg:justify-start gap-4 sm:gap-6 text-left md:text-center lg:text-left">
              <div className="flex -space-x-3 md:-space-x-5">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="w-10 h-10 md:w-14 md:h-14 rounded-full border-2 border-brand-bg overflow-hidden shadow-xl relative first:ml-0">
                    <Image 
                      src={`https://i.pravatar.cc/100?img=${i + 20}`} 
                      alt="User" 
                      fill
                      className="object-cover"
                      referrerPolicy="no-referrer" 
                    />
                  </div>
                ))}
              </div>
              <div className="flex flex-col justify-center gap-1">
                <div className="flex items-center text-secondary gap-0.5 md:justify-center lg:justify-start">
                  {[1, 2, 3, 4, 5].map((i) => <Star key={i} className="w-4 h-4 md:w-6 md:h-6 fill-current" />)}
                </div>
                <p className="text-[10px] md:text-base font-medium text-gray-300 whitespace-nowrap uppercase tracking-wider">Trusted by 10k+ users</p>
              </div>
            </div>
          </motion.div>

          {/* Floating UI Elements - Overlapping Tilted Review Cards */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.3 }}
            className="relative hidden lg:flex justify-center items-center h-[600px]"
          >
            {/* Review Card 1 (Darker Yellow) */}
            <motion.div
              animate={{ y: [0, -15, 0], rotate: [-5, -6, -5] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-20 right-0 z-20 bg-gradient-to-br from-[#5C5000] to-[#121212] p-8 rounded-[2rem] w-80 border border-primary/20 shadow-2xl"
            >
              <Quote className="text-primary w-10 h-10 mb-4 opacity-30" />
              <p className="text-lg font-black mb-6 leading-tight text-brand-text">
                &quot;Hammad Tools is a lifesaver! Got my Netflix and Canva Pro at 80% discount. Instant delivery!&quot;
              </p>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center font-bold text-brand-text">
                  JD
                </div>
                <div>
                  <p className="text-sm font-black text-brand-text">Ahmed Ali</p>
                  <p className="text-xs text-brand-text/40">Verified Customer</p>
                </div>
              </div>
            </motion.div>
 
            {/* Review Card 2 */}
            <motion.div
              animate={{ y: [0, 15, 0], rotate: [5, 6, 5] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
              className="absolute bottom-20 left-0 z-10 bg-gradient-to-bl from-[#FF8C2A]/20 to-[#1A1A1A] p-8 rounded-[2rem] w-80 border border-secondary/10 shadow-2xl"
            >
              <Quote className="text-secondary w-10 h-10 mb-4 opacity-30" />
              <p className="text-lg font-black mb-6 leading-tight text-brand-text">
                &quot;The support team is amazing. Had an issue with my ChatGPT Plus and they fixed it in 5 mins.&quot;
              </p>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center font-bold text-brand-text">
                  AS
                </div>
                <div>
                  <p className="text-sm font-black text-brand-text">Hina Iqbal</p>
                  <p className="text-xs text-brand-text/40">Pro Member</p>
                </div>
              </div>
            </motion.div>

            {/* Sleek Cursor Icon */}
            <motion.div
              animate={{ 
                x: [-80, 80, -80],
                y: [-40, 40, -40]
              }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
              className="absolute z-30 pointer-events-none"
            >
              <MousePointer2 className="w-12 h-12 text-primary fill-primary/20" />
            </motion.div>

            {/* Decorative Sharp Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 border border-primary/10 rounded-full -z-10" />
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
