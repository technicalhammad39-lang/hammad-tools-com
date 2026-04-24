'use client';

import { motion } from 'motion/react';
export default function GoogleBusinessReviews() {
  const embedUrl = 'https://www.google.com/maps?q=Paid+Services+By+Hammad&output=embed';

  return (
    <section className="py-12 md:py-24 relative overflow-hidden bg-brand-bg">
      <div className="site-container">
        <div className="text-center mb-8 md:mb-12">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-6xl font-black text-brand-text uppercase"
          >
            <span className="font-serif italic text-white normal-case">See Our Live</span>{' '}
            <span className="internal-gradient">Reviews</span>
          </motion.h2>
          <p className="text-brand-text/50 text-[10px] md:text-sm font-black uppercase tracking-widest mt-3 md:mt-4">
            Live client feedback from our Google Business profile
          </p>
        </div>

        <div className="glass rounded-2xl border border-white/5 overflow-hidden">
          <div className="aspect-[16/9] w-full">
            <iframe
              title="Google Business Reviews"
              src={embedUrl}
              className="w-full h-full"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>

      </div>
    </section>
  );
}
