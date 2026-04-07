'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Layout, Star, Clock, Loader2, Tag } from 'lucide-react';
import { db } from '@/firebase';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useSettings } from '@/context/SettingsContext';

interface AgencyService {
  id: string;
  title?: string;
  description?: string;
  thumbnail?: string;
  tags?: string[];
}

function getTitle(service: AgencyService) {
  return service.title || 'Untitled Service';
}

export default function AgencyServicesPage() {
  const router = useRouter();
  const { settings } = useSettings();
  const [services, setServices] = useState<AgencyService[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const unsubscribeServices = onSnapshot(
      query(collection(db, 'agency_services'), orderBy('createdAt', 'desc')),
      (snapshot) => {
        const docs = snapshot.docs
          .map((doc) => ({ id: doc.id, ...(doc.data() as Omit<AgencyService, 'id'>) }));
        setServices(docs);
        setLoading(false);
      },
      () => setLoading(false)
    );

    return () => {
      unsubscribeServices();
    };
  }, []);

  function buildWhatsappUrl(serviceTitle: string) {
    const rawPhone = settings.supportPhone || '';
    const phone = rawPhone.replace(/[^0-9]/g, '');
    const message = `Assalam o Alaikum, I want to request: ${serviceTitle}. Please share details and price.`;
    if (phone) {
      return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    }
    if (settings.whatsappUrl) {
      const separator = settings.whatsappUrl.includes('?') ? '&' : '?';
      return `${settings.whatsappUrl}${separator}text=${encodeURIComponent(message)}`;
    }
    return '#';
  }

  const filteredServices = useMemo(() => {
    if (!searchQuery.trim()) {
      return services;
    }
    const needle = searchQuery.trim().toLowerCase();
    return services.filter((service) => {
      const haystack = `${service.title || ''} ${service.description || ''} ${(service.tags || []).join(' ')}`.toLowerCase();
      return haystack.includes(needle);
    });
  }, [services, searchQuery]);

  return (
    <main className="min-h-screen pt-24 pb-20 bg-brand-bg relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex flex-col items-center text-center mb-8 md:mb-12">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-7xl font-black uppercase tracking-tight text-brand-text whitespace-nowrap"
          >
            <span className="font-serif italic text-white normal-case">Premium</span>{' '}
            <span className="internal-gradient">Services</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-brand-text/40 text-xs md:text-lg font-medium max-w-2xl mx-auto leading-relaxed mt-4"
          >
            Request premium agency-grade services directly from the website with secure payment proof and realtime approval tracking.
          </motion.p>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-10">
          <div className="relative w-full md:w-96">
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search services..."
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-[10px] font-black uppercase tracking-widest focus:outline-none focus:border-primary/50"
            />
          </div>
          <div className="text-[9px] font-black uppercase tracking-widest text-brand-text/40">{filteredServices.length} services</div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-40 gap-4">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
            <p className="text-[10px] font-black uppercase tracking-widest text-brand-text/20">Loading services...</p>
          </div>
        ) : filteredServices.length === 0 ? (
          <div className="text-center py-40 glass rounded-[3rem] border border-white/5">
            <Layout className="w-16 h-16 text-brand-text/10 mx-auto mb-6" />
            <h3 className="text-xl font-black uppercase text-brand-text mb-2">No Active Services</h3>
            <p className="text-brand-text/40 text-[10px] font-black uppercase tracking-widest">Add services from admin panel to show them here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-12">
            {filteredServices.map((service, index) => {
              const title = getTitle(service);
              return (
                <motion.div
                  key={service.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                  className="group relative flex flex-col bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-8 hover:border-primary/30 transition-all duration-700 hover:shadow-2xl hover:shadow-primary/5 hover:-translate-y-2 overflow-hidden"
                >
                  <div className="relative h-60 md:h-80 rounded-[2rem] overflow-hidden mb-8 border border-white/5 bg-brand-soft">
                    <Image
                      src={service.thumbnail || '/services-card.png'}
                      alt={title}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-1000"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />
                    <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
                      <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 flex items-center gap-1.5">
                        <Star className="w-3 h-3 text-primary fill-primary" />
                        <span className="text-[8px] font-black uppercase text-white/80">Premium</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col flex-1">
                    <h3 className="text-2xl md:text-3xl font-black text-brand-text uppercase leading-tight mb-4 group-hover:text-primary transition-colors">
                      {title}
                    </h3>

                    <p className="text-brand-text/40 text-xs md:text-sm font-medium leading-relaxed mb-6 line-clamp-3 italic">
                      {service.description || 'Contact us for this service.'}
                    </p>

                    {Array.isArray(service.tags) && service.tags.length ? (
                      <div className="flex flex-wrap gap-2 mb-6">
                        {service.tags.slice(0, 4).map((tag) => (
                          <span key={tag} className="text-[9px] font-black uppercase tracking-widest text-brand-text/40 border border-white/10 px-2 py-1 rounded-md flex items-center gap-1">
                            <Tag className="w-3 h-3 text-primary" /> {tag}
                          </span>
                        ))}
                      </div>
                    ) : null}

                    <div className="mt-auto flex flex-col gap-4">
                      <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-2">
                          <Clock className="w-3 h-3 text-brand-text/20" />
                          <span className="text-[9px] font-black uppercase tracking-widest text-brand-text/20">Custom Scope</span>
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-primary">Custom Quote</span>
                      </div>

                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          const url = buildWhatsappUrl(title);
                          if (url && url !== '#') {
                            window.open(url, '_blank', 'noopener,noreferrer');
                          }
                        }}
                        className="w-full bg-primary text-black py-4 rounded-[1.5rem] font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 hover:bg-primary/90 transition-all shadow-xl group/btn border-b-4 border-secondary"
                      >
                        <span>Request Service</span>
                        <ArrowRight className="w-3.5 h-3.5 ml-1 group-hover/btn:translate-x-1 transition-transform" />
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
