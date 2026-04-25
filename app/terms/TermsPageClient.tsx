'use client';

import React from 'react';
import { motion } from 'motion/react';
import { FileText } from 'lucide-react';

const TermsPage = () => {
  return (
    <div className="page-navbar-spacing pb-24 min-h-screen">
      <div className="site-container-readable">
        <div className="text-center mb-16">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mx-auto mb-6">
            <FileText className="w-8 h-8" />
          </div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            className="text-5xl font-bold mb-4"
          >
            Terms of <span className="text-primary">Service</span>
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
            By accessing or using SubHammad, you agree to be bound by these Terms of Service. Please read them carefully.
          </p>

          <h2 className="text-2xl font-bold mb-4 text-white">1. Acceptance of Terms</h2>
          <p className="text-brand-text/60 mb-6">
            By using our services, you agree to these terms. If you do not agree to all the terms and conditions of this agreement, then you may not access the website or use any services.
          </p>

          <h2 className="text-2xl font-bold mb-4 text-white">2. Use of Services</h2>
          <p className="text-brand-text/60 mb-6">
            You may use our services only as permitted by law and these terms. We may suspend or stop providing our services to you if you do not comply with our terms or policies.
          </p>

          <h2 className="text-2xl font-bold mb-4 text-white">3. User Accounts</h2>
          <p className="text-brand-text/60 mb-6">
            You are responsible for maintaining the confidentiality of your account and password and for restricting access to your computer. You agree to accept responsibility for all activities that occur under your account or password.
          </p>

          <h2 className="text-2xl font-bold mb-4 text-white">4. Payments and Refunds</h2>
          <p className="text-brand-text/60 mb-6">
            All payments are processed securely. Due to the nature of digital subscriptions, refunds are generally not provided once a service has been activated, unless otherwise stated in the specific service description.
          </p>

          <h2 className="text-2xl font-bold mb-4 text-white">5. Limitation of Liability</h2>
          <p className="text-brand-text/60 mb-6">
            SubHammad shall not be liable for any direct, indirect, incidental, special, or consequential damages resulting from the use or inability to use our services.
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default TermsPage;
