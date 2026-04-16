'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Image from 'next/image';
import {
  ShoppingCart,
  ChevronRight,
  Star,
  Search,
  CheckCircle2,
} from 'lucide-react';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '@/firebase';
import { usePathname } from 'next/navigation';
import type { Category, ProductItem } from '@/lib/types/domain';

function getTitle(service: ProductItem) {
  return service.title || service.name || 'Untitled Product';
}

function getSlug(service: ProductItem) {
  const slug = service.slug || getTitle(service);
  return slug.toLowerCase().replace(/\s+/g, '-');
}

function getPrice(service: ProductItem) {
  return Number(service.price ?? service.salePrice ?? 0);
}

function getOriginalPrice(service: ProductItem) {
  const original = Number(service.salePrice ?? 0);
  const current = getPrice(service);
  return original > current ? original : 0;
}

const ServicesSection = () => {
  const { addToCart } = useCart();
  const [services, setServices] = useState<ProductItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState<'order' | 'price-low' | 'price-high'>('order');
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribeServices = onSnapshot(
      query(collection(db, 'services'), orderBy('sortOrder', 'asc')),
      (snapshot) => {
        const docs = snapshot.docs
          .map((doc) => ({ id: doc.id, ...(doc.data() as Omit<ProductItem, 'id'>) }))
          .filter((service) => (service.type || 'tools') === 'tools' && service.active !== false);
        setServices(docs);
        setLoading(false);
      },
      (error) => {
        console.error('Failed to load tools:', error);
        setLoading(false);
      }
    );

    const unsubscribeCategories = onSnapshot(
      query(collection(db, 'categories'), orderBy('sortOrder', 'asc')),
      (snapshot) => {
        const docs = snapshot.docs
          .map((doc) => ({ id: doc.id, ...(doc.data() as Omit<Category, 'id'>) }))
          .filter((category) => category.active !== false && (category.type === 'tools' || category.type === 'both'));
        setCategories(docs);
      },
      (error) => {
        console.error('Failed to load categories:', error);
      }
    );

    return () => {
      unsubscribeServices();
      unsubscribeCategories();
    };
  }, []);

  const filteredServices = useMemo(() => {
    return services
      .filter((service) => {
        const title = getTitle(service);
        const matchesSearch =
          title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (service.description || '').toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory =
          selectedCategory === 'all' ||
          service.categoryId === selectedCategory;
        return matchesSearch && matchesCategory;
      })
      .sort((a, b) => {
        if (sortBy === 'price-low') {
          return getPrice(a) - getPrice(b);
        }
        if (sortBy === 'price-high') {
          return getPrice(b) - getPrice(a);
        }
        return Number(a.sortOrder ?? a.orderIndex ?? 0) - Number(b.sortOrder ?? b.orderIndex ?? 0);
      });
  }, [services, searchQuery, selectedCategory, sortBy]);

  const displayServices = pathname === '/' ? filteredServices.slice(0, 6) : filteredServices;

  if (loading) {
    return (
      <section className="py-16 md:py-32 relative overflow-hidden bg-brand-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-10 md:py-16 relative overflow-hidden bg-brand-bg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center text-center mb-8 md:mb-12 gap-4 md:gap-6">
          <div className="max-w-4xl flex flex-col items-center">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-[32px] sm:text-5xl md:text-6xl lg:text-7xl font-black mb-4 md:mb-6 text-brand-text uppercase leading-none text-center md:whitespace-nowrap"
            >
              <span className="font-serif italic text-white normal-case">Premium </span>
              <span className="internal-gradient inline">Subscriptions</span>
            </motion.h2>
            <p className="text-brand-text/50 text-sm md:text-lg font-medium max-w-2xl mx-auto text-center mt-2">
              Deploy high-performance digital subscriptions, exclusive premium software, and elite tools with instant automated execution.
            </p>
          </div>

          <div className="w-full md:w-auto flex justify-center md:justify-end">
            {pathname !== '/tools' && (
              <Link href="/tools" className="w-full md:w-auto">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-full md:w-auto bg-white/5 hover:bg-white/10 px-10 py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] border border-white/10 transition-all flex items-center justify-center gap-3"
                >
                  <span>Full Catalog</span>
                  <ChevronRight className="w-4 h-4" />
                </motion.button>
              </Link>
            )}
          </div>
        </div>

        {pathname === '/tools' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8 md:mb-16 items-center"
          >
            <div className="lg:col-span-4 relative group">
              <input
                type="text"
                placeholder="SEARCH TOOLS..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-12 py-5 text-[10px] font-black tracking-widest focus:outline-none focus:border-primary/50 transition-all uppercase placeholder:opacity-30"
              />
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text/30 group-focus-within:text-primary transition-colors" />
            </div>

            <div className="lg:col-span-8 flex items-center gap-2 sm:gap-3 overflow-x-auto pb-2 no-scrollbar">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`whitespace-nowrap px-6 py-4 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${selectedCategory === 'all'
                  ? 'bg-primary border-primary text-black shadow-lg shadow-primary/20'
                  : 'bg-white/5 border-white/5 text-brand-text/40 hover:border-white/20'
                  }`}
              >
                All
              </button>
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`whitespace-nowrap px-6 py-4 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${selectedCategory === category.id
                    ? 'bg-primary border-primary text-black shadow-lg shadow-primary/20'
                    : 'bg-white/5 border-white/5 text-brand-text/40 hover:border-white/20'
                    }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-12">
          <AnimatePresence mode="popLayout">
            {displayServices.map((service, index) => {
              const title = getTitle(service);
              const price = getPrice(service);
              const originalPrice = getOriginalPrice(service);
              const image = service.image || service.thumbnail || '/services-card.png';
              const categoryName = service.categoryName || service.category || 'General';

              return (
                <motion.div
                  key={service.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                  className="group relative flex flex-col h-full bg-brand-soft/20 backdrop-blur-3xl rounded-[2rem] md:rounded-[3rem] overflow-hidden border border-white/5 transition-all duration-700 hover:border-primary/30 hover:shadow-2xl hover:shadow-primary/5"
                >
                  <Link
                    href={`/tools/${getSlug(service)}`}
                    className="absolute inset-0 z-10"
                    aria-label={`View ${title}`}
                  />

                  <div className="relative h-48 md:h-72 overflow-hidden bg-white/5">
                    <Image
                      src={image}
                      alt={title}
                      fill
                      className="object-cover transition-transform duration-1000 group-hover:scale-110 p-4 rounded-[2.5rem]"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-brand-bg via-transparent to-transparent opacity-80" />

                    <div className="absolute top-6 left-6 right-6 flex justify-start items-start z-20">
                      <span className="bg-black/60 backdrop-blur-md text-white text-[9px] font-black tracking-[0.2em] px-5 py-2.5 rounded-xl border border-white/10">
                        {categoryName}
                      </span>
                    </div>

                    <div className="absolute bottom-6 left-6 md:left-10 right-6 md:right-10 flex items-center justify-between z-20">
                      <div className="flex items-center space-x-1 text-secondary">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star key={star} className="w-2.5 h-2.5 fill-current" />
                        ))}
                        <span className="text-[10px] font-black ml-2 text-white/60">5.0</span>
                      </div>
                      <div className="text-[9px] font-black uppercase tracking-widest text-primary/80 flex items-center gap-2">
                        <CheckCircle2 className="w-3 h-3" />
                        Verified
                      </div>
                    </div>
                  </div>

                  <div className="p-6 md:p-10 flex flex-col flex-1 relative z-20">
                    <h3 className="text-2xl md:text-3xl font-black mb-2 md:mb-4 text-brand-text group-hover:text-primary transition-colors leading-none whitespace-pre-wrap break-words">{title}</h3>
                    <p className="text-brand-text/40 mb-6 md:mb-10 line-clamp-2 text-xs md:sm font-medium leading-relaxed italic">{service.description}</p>

                    <div className="mt-auto">
                      <div className="flex items-end justify-between mb-6 md:mb-8">
                        <div>
                          <span className="text-[8px] text-brand-text/20 block uppercase tracking-[0.4em] font-black mb-1">Global Access</span>
                          <div className="flex items-baseline gap-1">
                            <span className="text-[10px] text-brand-text/40 font-bold whitespace-nowrap">Rs</span>
                            <span className="text-3xl md:text-4xl font-black text-brand-text">{price}</span>
                          </div>
                          {originalPrice > 0 ? (
                            <div className="text-xs text-brand-text/35 line-through mt-1">Rs {originalPrice}</div>
                          ) : null}
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-emerald-400 font-black uppercase tracking-widest block bg-emerald-400/10 px-3 py-1 rounded-lg">Instant</span>
                        </div>
                      </div>

                      <div className="flex gap-3 relative z-30">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            addToCart({
                              id: service.id,
                              name: title,
                              price,
                              image,
                              quantity: 1,
                            });
                          }}
                          className="flex-1 bg-white/5 hover:bg-white/10 py-3 md:py-4 rounded-2xl border border-white/5 flex items-center justify-center gap-2 md:gap-3 transition-all group/btn"
                        >
                          <ShoppingCart className="w-4 h-4 text-brand-text/20 group-hover/btn:text-primary transition-colors" />
                          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-text/40 group-hover/btn:text-brand-text">Cart</span>
                        </motion.button>

                        <Link href={`/tools/${getSlug(service)}`} className="flex-[2]">
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="w-full bg-primary text-black py-3 md:py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-2 md:gap-3 border-b-4 border-secondary shadow-xl shadow-primary/10 group/order"
                          >
                            <span>Buy Now</span>
                          </motion.button>
                        </Link>
                      </div>
                    </div>
                  </div>

                  <div className="absolute inset-[1px] rounded-[2rem] md:rounded-[3rem] border border-white/5 pointer-events-none -z-10" />
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {filteredServices.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-40 flex flex-col items-center"
          >
            <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-8 border border-white/5">
              <Search className="w-8 h-8 text-brand-text/10" />
            </div>
            <h3 className="text-2xl font-black uppercase text-brand-text mb-4">No Products Found</h3>
            <p className="text-brand-text/40 font-medium">Try adjusting your search query or category filters.</p>
          </motion.div>
        )}
      </div>
    </section>
  );
};

export default ServicesSection;

