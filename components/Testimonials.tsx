'use client';

import React from 'react';
import { motion } from 'motion/react';
import Image from 'next/image';
import { Star, Quote } from 'lucide-react';
import Marquee from 'react-fast-marquee';

const testimonials = [
  {
    name: 'Sarah Johnson',
    role: 'Digital Creator',
    content: 'SubHammad has completely changed how I manage my tools. The instant delivery is real, and the prices are unbeatable!',
    rating: 5,
    avatar: 'https://i.pravatar.cc/150?u=sarah'
  },
  {
    name: 'Michael Chen',
    role: 'Software Engineer',
    content: 'I was skeptical at first, but the support team is incredible. They helped me set up my ChatGPT Plus in minutes.',
    rating: 5,
    avatar: 'https://i.pravatar.cc/150?u=michael'
  },
  {
    name: 'Elena Rodriguez',
    role: 'Student',
    content: 'Perfect for students on a budget. I can get all the premium tools I need for my studies without breaking the bank.',
    rating: 5,
    avatar: 'https://i.pravatar.cc/150?u=elena'
  },
  {
    name: 'David Lee',
    role: 'Entrepreneur',
    content: 'The efficiency and cost-effectiveness of SubHammad are unmatched. A must-have for any serious professional.',
    rating: 5,
    avatar: 'https://i.pravatar.cc/150?u=david'
  },
  {
    name: 'Jessica Kim',
    role: 'Graphic Designer',
    content: 'Access to premium design tools at such low prices? It\'s a game-changer for my freelance business!',
    rating: 5,
    avatar: 'https://i.pravatar.cc/150?u=jessica'
  },
  {
    name: 'Omar Hassan',
    role: 'Marketing Specialist',
    content: 'SubHammad helped me scale my marketing efforts without draining my budget. Highly recommend their services!',
    rating: 5,
    avatar: 'https://i.pravatar.cc/150?u=omar'
  }
];

interface Testimonial {
  name: string;
  role: string;
  content: string;
  rating: number;
  avatar: string;
}

const TestimonialCard = ({ t }: { t: Testimonial; i: number }) => (
  <div className="glass rounded-[1.5rem] sm:rounded-[2rem] p-4 sm:p-5 md:p-6 border border-white/5 relative group hover:border-primary/30 transition-all duration-500 w-full flex-shrink-0">
    <Quote className="absolute top-4 right-6 w-8 h-8 text-primary/5 group-hover:text-primary/10 transition-colors" />

    <div className="flex items-center space-x-1 mb-4 text-primary">
      {[...Array(t.rating)].map((_, starIdx) => <Star key={starIdx} className="w-2.5 h-2.5 fill-current" />)}
    </div>

    <p className="text-brand-text/70 mb-5 sm:mb-6 leading-relaxed italic text-[10px] sm:text-[11px] font-medium line-clamp-3 min-h-[48px]">
      &quot;{t.content}&quot;
    </p>

    <div className="flex items-center space-x-3">
      <div className="p-0.5 rounded-xl bg-primary/10 border border-primary/20 w-10 h-10 relative overflow-hidden">
        <Image
          src={t.avatar}
          alt={t.name}
          fill
          className="object-cover"
          referrerPolicy="no-referrer"
        />
      </div>
      <div>
        <h4 className="font-black text-brand-text text-[10px] sm:text-[11px] uppercase leading-none">{t.name}</h4>
        <p className="text-[7px] sm:text-[8px] text-brand-text/40 font-black uppercase tracking-widest mt-1">{t.role}</p>
      </div>
    </div>
  </div>
);

const Testimonials = () => {
  const row1 = testimonials.slice(0, 3);
  const row2 = testimonials.slice(3, 6);

  return (
    <section className="pt-10 pb-6 md:pt-20 md:pb-12 relative bg-white/[0.01] overflow-hidden">
      <div className="site-container">
        <div className="text-center mb-8 md:mb-20">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-7xl font-black mb-3 md:mb-6 text-brand-text uppercase"
          >
            <span className="font-serif italic text-white normal-case">What Our</span> <span className="internal-gradient">Legends</span> Say
          </motion.h2>
          <p className="text-brand-text/60 text-[10px] md:text-sm font-black uppercase tracking-widest">Join 10,000+ satisfied users worldwide.</p>
        </div>

        {/* Unified Layout: Dual-Row Auto Marquee for all screens */}
        <div className="relative space-y-4 md:space-y-8 -mx-4 sm:-mx-6 lg:-mx-8">
          <div className="pointer-events-none absolute inset-y-0 left-0 w-16 sm:w-24 lg:w-40 bg-gradient-to-r from-brand-bg to-transparent z-10" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-16 sm:w-24 lg:w-40 bg-gradient-to-l from-brand-bg to-transparent z-10" />

          <Marquee speed={20} gradient={false} pauseOnHover={true}>
            {testimonials.slice(0, 3).map((t, i) => (
              <div key={i} className="mx-2 sm:mx-3 md:mx-4 w-[220px] sm:w-[260px] md:w-[320px] lg:w-[360px]">
                <TestimonialCard t={t} i={i} />
              </div>
            ))}
            {/* Repeat for seamless loop on wide screens if needed */}
            {testimonials.slice(0, 3).map((t, i) => (
              <div key={i + 10} className="mx-2 sm:mx-3 md:mx-4 w-[220px] sm:w-[260px] md:w-[320px] lg:w-[360px]">
                <TestimonialCard t={t} i={i} />
              </div>
            ))}
          </Marquee>
          <Marquee speed={15} direction="right" gradient={false} pauseOnHover={true}>
            {testimonials.slice(3, 6).map((t, i) => (
              <div key={i} className="mx-2 sm:mx-3 md:mx-4 w-[220px] sm:w-[260px] md:w-[320px] lg:w-[360px]">
                <TestimonialCard t={t} i={i} />
              </div>
            ))}
            {/* Repeat for seamless loop on wide screens if needed */}
            {testimonials.slice(3, 6).map((t, i) => (
              <div key={i + 20} className="mx-2 sm:mx-3 md:mx-4 w-[220px] sm:w-[260px] md:w-[320px] lg:w-[360px]">
                <TestimonialCard t={t} i={i} />
              </div>
            ))}
          </Marquee>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
