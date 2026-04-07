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
  <div className="glass rounded-[2rem] p-6 border border-white/5 relative group hover:border-primary/30 transition-all duration-500 w-full flex-shrink-0">
    <Quote className="absolute top-4 right-6 w-8 h-8 text-primary/5 group-hover:text-primary/10 transition-colors" />

    <div className="flex items-center space-x-1 mb-4 text-primary">
      {[...Array(t.rating)].map((_, starIdx) => <Star key={starIdx} className="w-2.5 h-2.5 fill-current" />)}
    </div>

    <p className="text-brand-text/70 mb-6 leading-relaxed italic text-[11px] font-medium h-12 overflow-hidden line-clamp-2">
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
        <h4 className="font-black text-brand-text text-[11px] uppercase leading-none">{t.name}</h4>
        <p className="text-[8px] text-brand-text/40 font-black uppercase tracking-widest mt-1">{t.role}</p>
      </div>
    </div>
  </div>
);

const Testimonials = () => {
  const row1 = testimonials.slice(0, 3);
  const row2 = testimonials.slice(3, 6);

  return (
    <section className="py-16 md:py-32 relative bg-white/[0.01]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12 md:mb-20">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-7xl font-black mb-4 md:mb-6 text-brand-text uppercase"
          >
            <span className="font-serif italic text-white normal-case">What Our</span> <span className="internal-gradient">Legends</span> Say
          </motion.h2>
          <p className="text-brand-text/60 text-[10px] md:text-sm font-black uppercase tracking-widest">Join 10,000+ satisfied users worldwide.</p>
        </div>

        {/* Unified Layout: Dual-Row Auto Marquee for all screens */}
        <div className="space-y-4 md:space-y-8 -mx-4 sm:-mx-6 lg:-mx-8">
          <Marquee speed={20} gradient={false} pauseOnHover={true}>
            {testimonials.slice(0, 3).map((t, i) => (
              <div key={i} className="mx-2 sm:mx-3 md:mx-4 w-[260px] sm:w-[300px] md:w-[360px] lg:w-[380px]">
                <TestimonialCard t={t} i={i} />
              </div>
            ))}
            {/* Repeat for seamless loop on wide screens if needed */}
            {testimonials.slice(0, 3).map((t, i) => (
              <div key={i + 10} className="mx-2 sm:mx-3 md:mx-4 w-[260px] sm:w-[300px] md:w-[360px] lg:w-[380px]">
                <TestimonialCard t={t} i={i} />
              </div>
            ))}
          </Marquee>
          <Marquee speed={15} direction="right" gradient={false} pauseOnHover={true}>
            {testimonials.slice(3, 6).map((t, i) => (
              <div key={i} className="mx-2 sm:mx-3 md:mx-4 w-[260px] sm:w-[300px] md:w-[360px] lg:w-[380px]">
                <TestimonialCard t={t} i={i} />
              </div>
            ))}
            {/* Repeat for seamless loop on wide screens if needed */}
            {testimonials.slice(3, 6).map((t, i) => (
              <div key={i + 20} className="mx-2 sm:mx-3 md:mx-4 w-[260px] sm:w-[300px] md:w-[360px] lg:w-[380px]">
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
