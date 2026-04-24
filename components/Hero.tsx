'use client';

import React from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Play, Star, MousePointer2, Quote } from 'lucide-react';
import Link from 'next/link';
import UploadedImage from '@/components/UploadedImage';

const HERO_PHRASES = ['PRO COURSES', 'PREMIUM TOOLS', 'DIGITAL ASSETS'];
const LONGEST_HERO_PHRASE = HERO_PHRASES.reduce((longest, phrase) =>
  phrase.length > longest.length ? phrase : longest
);

const Hero = () => {
  const [showDesktopVideo, setShowDesktopVideo] = React.useState(false);
  const [activePhraseIndex, setActivePhraseIndex] = React.useState(0);
  const [typedPhrase, setTypedPhrase] = React.useState('');
  const [isDeletingPhrase, setIsDeletingPhrase] = React.useState(false);
  const reviewAvatars = [
    '/reviews/1-rev.png',
    '/reviews/2-rev.png',
    '/reviews/3-rev3.png',
    '/reviews/4-rev4.png',
  ];

  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1024px)');
    const sync = () => setShowDesktopVideo(mediaQuery.matches);
    sync();

    mediaQuery.addEventListener('change', sync);
    return () => mediaQuery.removeEventListener('change', sync);
  }, []);

  React.useEffect(() => {
    const currentPhrase = HERO_PHRASES[activePhraseIndex] || '';
    const phraseComplete = !isDeletingPhrase && typedPhrase === currentPhrase;
    const phraseCleared = isDeletingPhrase && typedPhrase.length === 0;

    const delay = phraseComplete ? 1850 : isDeletingPhrase ? 46 : 90;

    const timer = window.setTimeout(() => {
      if (phraseComplete) {
        setIsDeletingPhrase(true);
        return;
      }

      if (phraseCleared) {
        setIsDeletingPhrase(false);
        setActivePhraseIndex((prev) => (prev + 1) % HERO_PHRASES.length);
        return;
      }

      const nextLength = isDeletingPhrase ? typedPhrase.length - 1 : typedPhrase.length + 1;
      setTypedPhrase(currentPhrase.slice(0, nextLength));
    }, delay);

    return () => window.clearTimeout(timer);
  }, [activePhraseIndex, isDeletingPhrase, typedPhrase]);

  return (
    <section className="relative min-h-[70svh] sm:min-h-[76svh] lg:min-h-[88dvh] flex flex-col items-center justify-center pt-10 sm:pt-12 lg:pt-16 pb-3 sm:pb-5 lg:pb-2 overflow-hidden w-full">
      {/* Background Layer */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        {showDesktopVideo ? (
          <video
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover opacity-20"
          >
            <source src="/web-background.mp4" type="video/mp4" />
          </video>
        ) : null}
        <div className="absolute inset-0 bg-black/60" />
        <div className="absolute inset-0 cyber-grid opacity-[0.1]" />
        
        {/* Decorative Gradients */}
        <div className="absolute top-[10%] left-[10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[10%] right-[10%] w-[40%] h-[40%] bg-accent/5 rounded-full blur-[120px]" />
      </div>

      <div className="site-container-wide w-full relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.14fr)_minmax(0,0.86fr)] gap-7 sm:gap-9 md:gap-10 lg:gap-9 xl:gap-11 items-center">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="relative z-20 md:w-full md:max-w-4xl md:mx-auto md:flex md:flex-col md:items-center md:text-center lg:items-start lg:text-left lg:mx-0 lg:max-w-none"
          >
            <h1 className="mb-4 md:mb-6 text-brand-text text-left md:text-center lg:text-left">
              <span className="block text-[clamp(1.7rem,7.4vw,2.5rem)] md:text-[clamp(1.45rem,4.4vw,4.25rem)] font-serif font-bold md:font-extrabold italic text-white leading-[1.06]">
                Unlock The
              </span>
              <span className="relative mt-1 sm:mt-2 block min-h-[1.16em] overflow-visible">
                <span
                  aria-hidden="true"
                  style={{ fontFamily: 'var(--font-display)' }}
                  className="invisible block w-max md:mx-auto lg:mx-0 text-[clamp(2.8rem,13vw,4.95rem)] sm:text-[clamp(3.05rem,11.8vw,5.35rem)] md:text-[clamp(2.2rem,6.9vw,6.4rem)] font-black uppercase leading-[1.01] tracking-[0.006em] whitespace-nowrap"
                >
                  {LONGEST_HERO_PHRASE}
                </span>
                <span
                  style={{ fontFamily: 'var(--font-display)' }}
                  className="absolute inset-0 inline-flex w-max items-end md:mx-auto lg:mx-0 text-[clamp(2.8rem,13vw,4.95rem)] sm:text-[clamp(3.05rem,11.8vw,5.35rem)] md:text-[clamp(2.2rem,6.9vw,6.4rem)] font-black bg-gradient-to-b from-[#FFEA00] to-[#FF9500] bg-clip-text text-transparent uppercase leading-[1.01] tracking-[0.006em] whitespace-nowrap"
                >
                  {typedPhrase || '\u00A0'}
                  <span aria-hidden="true" className="typing-caret ml-1 inline-block h-[0.86em] w-[0.07em] rounded-full bg-[#FFEA00]" />
                </span>
              </span>
            </h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="text-[12px] sm:text-[13px] md:text-2xl text-gray-300/90 md:text-brand-text/60 mt-1.5 md:mt-3 mb-5 md:mb-6 max-w-md sm:max-w-lg md:max-w-3xl leading-[1.55] md:leading-relaxed font-medium relative z-20 text-left md:text-center lg:text-left mx-0 md:mx-auto lg:mx-0"
            >
              Access Netflix, ChatGPT Plus, Canva Pro, and 50+ other premium content access at unbeatable prices. Fast, secure, and reliable.
            </motion.p>

            <div className="md:hidden flex w-full flex-col min-[420px]:flex-row gap-2.5 justify-start">
              <Link href="/tools" className="w-full min-[420px]:flex-1">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full bg-primary text-brand-bg px-5 py-3 rounded-xl font-black flex items-center justify-center gap-2 transition-all border-b-4 border-[#FF8C2A] shadow-xl shadow-primary/10"
                >
                  <span className="text-xs uppercase tracking-[0.08em]">Explore Tools</span>
                  <ArrowRight className="w-4 h-4 -rotate-45" />
                </motion.button>
              </Link>
              <Link href="/services" className="w-full min-[420px]:flex-1">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full bg-[#101010] text-primary px-5 py-3 rounded-xl font-black flex items-center justify-center gap-2 transition-all border border-primary/35"
                >
                  <span className="text-xs uppercase tracking-[0.08em]">Services</span>
                  <ArrowRight className="w-4 h-4 -rotate-45" />
                </motion.button>
              </Link>
            </div>

            <div className="hidden md:flex flex-col sm:flex-row gap-3 md:gap-6 justify-start md:justify-center lg:justify-start w-full md:w-auto">
              <Link href="/tools" className="w-full md:w-auto">
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full md:w-auto bg-primary text-brand-bg px-8 md:px-12 py-3.5 md:py-6 rounded-xl font-black flex items-center justify-center space-x-3 transition-all border-b-4 border-[#FF8C2A] shadow-xl shadow-primary/10"
                >
                  <span className="text-sm md:text-xl">Explore Tools</span>
                  <ArrowRight className="w-5 h-5 md:w-7 md:h-7" />
                </motion.button>
              </Link>
              <Link href="/about" className="w-full md:w-auto">
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full md:w-auto glass hover:bg-white/10 text-white px-8 md:px-12 py-3.5 md:py-6 rounded-xl font-bold flex items-center justify-center space-x-3 transition-all border border-white/20"
                >
                  <Play className="w-5 h-5 md:w-7 md:h-7 fill-current" />
                  <span className="text-sm md:text-xl">How it Works</span>
                </motion.button>
              </Link>
            </div>

            <div className="mt-6 md:mt-8 flex flex-row items-center justify-start md:justify-center lg:justify-start gap-4 sm:gap-6 text-left md:text-center lg:text-left">
              <div className="flex -space-x-3 md:-space-x-5">
                {reviewAvatars.map((avatarSrc, index) => (
                  <div key={avatarSrc} className="w-10 h-10 md:w-14 md:h-14 rounded-full border-2 border-brand-bg overflow-hidden shadow-xl relative first:ml-0">
                    <UploadedImage
                      src={avatarSrc}
                      fallbackSrc="/services-card.webp"
                      alt={`Trusted user review avatar ${index + 1}`}
                      className="absolute inset-0 w-full h-full object-cover"
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
            className="relative z-10 hidden lg:flex justify-center items-center h-[530px]"
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
                <div className="w-10 h-10 rounded-full bg-white/10 border border-white/20 overflow-hidden relative">
                  <UploadedImage
                    src="/rev-1hm.webp"
                    fallbackSrc="/reviews/1-rev.png"
                    alt="Ali Rajput profile photo"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                </div>
                <div>
                  <p className="text-sm font-black text-brand-text">Ali Rajput</p>
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
                <div className="w-10 h-10 rounded-full bg-white/10 border border-white/20 overflow-hidden relative">
                  <UploadedImage
                    src="/rev-2hm.webp"
                    fallbackSrc="/reviews/2-rev.png"
                    alt="Hina Iqbal profile photo"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
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
