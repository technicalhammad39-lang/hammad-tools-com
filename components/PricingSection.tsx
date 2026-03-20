'use client';

import React from 'react';
import { motion } from 'motion/react';
import { Check, Zap } from 'lucide-react';

const plans = [
  {
    name: 'Basic',
    price: '$9.99',
    description: 'Perfect for individuals starting out.',
    features: [
      'Access to 5 Basic Services',
      'Standard Support',
      'Instant Delivery',
      '1 Device Access',
    ],
    recommended: false,
  },
  {
    name: 'Pro',
    price: '$24.99',
    description: 'Best for power users and creators.',
    features: [
      'Access to 15 Premium Services',
      'Priority 24/7 Support',
      'Instant Delivery',
      '3 Devices Access',
      'Exclusive Giveaways',
    ],
    recommended: true,
  },
  {
    name: 'Premium',
    price: '$49.99',
    description: 'The ultimate subscription experience.',
    features: [
      'Access to ALL Services',
      'Dedicated Account Manager',
      'Instant Delivery',
      'Unlimited Devices',
      'Early Access to New Tools',
      'VIP Giveaway Entries',
    ],
    recommended: false,
  },
];

const PricingSection = () => {
  return (
    <section className="py-24 bg-brand-bg/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-6xl font-black mb-4 uppercase"
          >
            Simple <span className="internal-gradient">Pricing</span> Plans
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-brand-text/60 max-w-2xl mx-auto text-xs font-black uppercase tracking-widest"
          >
            Choose the plan that fits your needs. No hidden fees, cancel anytime.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className={`relative rounded-[2rem] p-10 border transition-all duration-500 ${
                plan.recommended 
                ? 'bg-primary/5 border-primary scale-105 z-10' 
                : 'glass border-white/10 hover:border-white/20'
              }`}
            >
              {plan.recommended && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-white px-6 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center space-x-2 border-b-2 border-accent">
                  <Zap className="w-3 h-3 fill-current" />
                  <span>Recommended</span>
                </div>
              )}

              <div className="mb-8">
                <h3 className="text-2xl font-black text-brand-text uppercase tracking-widest">{plan.name}</h3>
                <p className="text-brand-text/40 text-[10px] font-black uppercase tracking-widest mt-1">{plan.description}</p>
              </div>

              <div className="mb-8">
                <span className="text-5xl font-black text-brand-text">{plan.price}</span>
                <span className="text-brand-text/40 ml-2 text-xs font-black uppercase tracking-widest">/ month</span>
              </div>

              <ul className="space-y-4 mb-10">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center space-x-3 text-brand-text/60">
                    <div className={`w-5 h-5 rounded-lg flex items-center justify-center border ${plan.recommended ? 'bg-primary border-accent text-white' : 'bg-white/5 border-white/10 text-primary'}`}>
                      <Check className="w-3 h-3" />
                    </div>
                    <span className="text-xs font-black uppercase tracking-widest">{feature}</span>
                  </li>
                ))}
              </ul>

              <button className={`w-full py-4 rounded-xl font-black transition-all active:scale-95 text-xs uppercase tracking-widest border-b-2 ${
                plan.recommended 
                ? 'bg-primary text-white border-accent' 
                : 'glass border-white/10 hover:bg-white/5 text-white'
              }`}>
                Get Started
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
