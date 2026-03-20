'use client';

import React from 'react';
import ServicesSection from '@/components/ServicesSection';
import { motion } from 'motion/react';

const ServicesPage = () => {
  return (
    <main className="min-h-screen pt-8 md:pt-12 pb-20 bg-brand-bg">
      {/* Removed redundant top heading. ServicesSection handles its own heading. */}
      <ServicesSection />
    </main>
  );
};

export default ServicesPage;
