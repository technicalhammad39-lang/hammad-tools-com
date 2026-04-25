'use client';

import React from 'react';
import { motion } from 'motion/react';
import { Shield } from 'lucide-react';

const PrivacyPage = () => {
  return (
    <div className="page-navbar-spacing pb-24 min-h-screen">
      <div className="site-container-readable">
        <div className="text-center mb-16">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mx-auto mb-6">
            <Shield className="w-8 h-8" />
          </div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            className="text-5xl font-bold mb-4"
          >
            Privacy <span className="text-primary">Policy</span>
          </motion.h1>
          <p className="text-brand-text/40">Last Updated: March 12, 2026</p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          className="glass rounded-[2.5rem] p-12 border-white/10 prose prose-invert max-w-none"
        >
          <p className="text-lg text-brand-text/60 leading-relaxed mb-8">
            At SubHammad, we take your privacy seriously. This policy describes how we collect, use, and protect your personal information when you use our services.
          </p>

          <h2 className="text-2xl font-bold mb-4 text-white">1. Information We Collect</h2>
          <p className="text-brand-text/60 mb-6">
            We collect information you provide directly to us, such as when you create an account, make a purchase, or contact our support team. This may include your name, email address, and payment information.
          </p>

          <h2 className="text-2xl font-bold mb-4 text-white">2. How We Use Your Information</h2>
          <p className="text-brand-text/60 mb-6">
            We use the information we collect to provide, maintain, and improve our services, to process transactions, and to communicate with you about your account and our services.
          </p>

          <h2 className="text-2xl font-bold mb-4 text-white">3. Data Security</h2>
          <p className="text-brand-text/60 mb-6">
            We implement a variety of security measures to maintain the safety of your personal information. Your personal information is contained behind secured networks and is only accessible by a limited number of persons who have special access rights to such systems.
          </p>

          <h2 className="text-2xl font-bold mb-4 text-white">4. Third-Party Services</h2>
          <p className="text-brand-text/60 mb-6">
            We may use third-party services to help us operate our business and the site or administer activities on our behalf. We do not sell, trade, or otherwise transfer to outside parties your personally identifiable information.
          </p>

          <h2 className="text-2xl font-bold mb-4 text-white">5. Changes to This Policy</h2>
          <p className="text-brand-text/60 mb-6">
            We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page.
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default PrivacyPage;
