import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Image from 'next/image';
import {
  ShoppingCart,
  Zap,
  ChevronRight,
  Star,
  Search,
  Filter,
  SortAsc,
  CheckCircle2
} from 'lucide-react';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '@/firebase';
import { usePathname } from 'next/navigation';

interface Plan {
  name: string;
  price: number;
  benefits: string[];
}

interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  orderIndex?: number;
  plans?: Plan[];
}

const mockServices: Service[] = [
  {
    id: 'mock-1',
    name: 'Netflix Premium',
    description: 'Ultra HD streaming on 4 screens simultaneously. Global access.',
    price: 9.99,
    image: 'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?auto=format&fit=crop&q=80&w=800',
    category: 'Streaming',
    orderIndex: 1
  },
  {
    id: 'mock-2',
    name: 'ChatGPT Plus',
    description: 'Access to GPT-4, DALL-E, and faster response times.',
    price: 14.99,
    image: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&q=80&w=800',
    category: 'AI Tools',
    orderIndex: 2
  },
  {
    id: 'mock-3',
    name: 'Canva Pro',
    description: 'Unlimited premium content, brand kits, and magic resize.',
    price: 5.99,
    image: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?auto=format&fit=crop&q=80&w=800',
    category: 'Design',
    orderIndex: 3
  }
];

const categories = [
  'All',
  'Streaming',
  'AI Tools',
  'Design',
  'Web Dev',
  'App Dev',
  'Tools',
  'Gaming',
  'Education'
];

const ServicesSection = () => {
  const { addToCart } = useCart();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState<'order' | 'price-low' | 'price-high'>('order');
  const pathname = usePathname();

  useEffect(() => {
    const q = query(collection(db, 'services'), orderBy('orderIndex', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const firebaseServices = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Service[];

      // Merge Logic: Use firebase services, but add mocks if they don't exist by name
      const merged = [...firebaseServices];
      mockServices.forEach(mock => {
        if (!merged.find(s => s.name.toLowerCase() === mock.name.toLowerCase())) {
          merged.push(mock);
        }
      });

      setServices(merged);
      setLoading(false);
    }, (error) => {
      console.error('Firestore Error:', error);
      setServices(mockServices);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredServices = services
    .filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || s.category === selectedCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      if (sortBy === 'price-low') return a.price - b.price;
      if (sortBy === 'price-high') return b.price - a.price;
      return (a.orderIndex || 99) - (b.orderIndex || 99);
    });

  const displayServices = pathname === '/' ? filteredServices.slice(0, 6) : filteredServices;

  if (loading) {
    return (
      <section className="py-16 md:py-32 relative overflow-hidden bg-brand-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center"><div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 md:py-32 relative overflow-hidden bg-brand-bg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header Area */}
        <div className="flex flex-col items-center text-center mb-16 gap-10">
          <div className="max-w-3xl flex flex-col items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="inline-flex items-center space-x-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 mb-6 shadow-lg shadow-primary/5"
            >
              <Zap className="w-4 h-4 text-primary animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Our Services</span>
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`text-[40px] sm:text-6xl md:text-8xl font-black mb-6 tracking-tighter text-brand-text uppercase leading-none text-center`}
            >
              <span className="md:inline">Premium </span>
              <span className="internal-gradient md:inline">Subscriptions</span>
            </motion.h2>
            <p className="text-brand-text/50 text-sm md:text-lg font-medium max-w-2xl mx-auto text-center">
              Deploy high-performance digital subscriptions, exclusive premium software, and elite tools with instant automated execution.
            </p>
          </div>

          <div className="w-full md:w-auto flex justify-center md:justify-end">
            {pathname !== '/services' && (
              <Link href="/services" className="w-full md:w-auto">
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

        {/* Filters & Search - Only on /services page */}
        {pathname === '/services' && (
          <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8 md:mb-16 items-center"
            >
            {/* Search */}
            <div className="lg:col-span-4 relative group">
              <input
                type="text"
                placeholder="SEARCH SERVICES..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-12 py-5 text-[10px] font-black tracking-widest focus:outline-none focus:border-primary/50 transition-all uppercase placeholder:opacity-30"
              />
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text/30 group-focus-within:text-primary transition-colors" />
            </div>

            {/* Category Filter */}
            <div className="lg:col-span-8 flex items-center gap-2 sm:gap-3 overflow-x-auto pb-2 no-scrollbar">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`whitespace-nowrap px-6 py-4 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${selectedCategory === cat
                    ? 'bg-primary border-primary text-black shadow-lg shadow-primary/20'
                    : 'bg-white/5 border-white/5 text-brand-text/40 hover:border-white/20'
                    }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-12">
          <AnimatePresence mode="popLayout">
            {displayServices.map((service, index) => (
              <motion.div
                key={service.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                className="group relative flex flex-col h-full bg-brand-soft/20 backdrop-blur-3xl rounded-[2rem] md:rounded-[3rem] overflow-hidden border border-white/5 transition-all duration-700 hover:border-primary/30 hover:shadow-2xl hover:shadow-primary/5"
              >
                {/* Link Overlay - Makes whole card clickable except for specific buttons */}
                <Link 
                  href={`/services/${service.name.toLowerCase().replace(/ /g, '-')}`}
                  className="absolute inset-0 z-10"
                  aria-label={`View ${service.name}`}
                />

                {/* Thumbnail */}
                <div className="relative h-48 md:h-72 overflow-hidden bg-white/5">
                  <Image
                    src={'/services-card.png'}
                    alt={service.name}
                    fill
                    className="object-cover transition-transform duration-1000 group-hover:scale-110 p-4 rounded-[2.5rem]"
                    referrerPolicy="no-referrer"
                    onError={(e: any) => {
                      e.target.src = 'https://images.unsplash.com/photo-1614332287897-cdc485fa562d?q=80&w=800';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-brand-bg via-transparent to-transparent opacity-80" />

                  {/* Floating Meta */}
                  <div className="absolute top-6 left-6 right-6 flex justify-between items-start z-20">
                    <span className="bg-black/60 backdrop-blur-md text-white text-[9px] font-black uppercase tracking-[0.2em] px-5 py-2.5 rounded-xl border border-white/10">
                      {service.category}
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-primary/20 backdrop-blur-md border border-primary/30 flex items-center justify-center text-primary">
                      <Zap className="w-5 h-5 fill-current" />
                    </div>
                  </div>

                  <div className="absolute bottom-6 left-6 md:left-10 right-6 md:right-10 flex items-center justify-between z-20">
                    <div className="flex items-center space-x-1 text-secondary">
                      {[1, 2, 3, 4, 5].map((i) => <Star key={i} className="w-2.5 h-2.5 fill-current" />)}
                      <span className="text-[10px] font-black ml-2 text-white/60">5.0</span>
                    </div>
                    <div className="text-[9px] font-black uppercase tracking-widest text-primary/80 flex items-center gap-2">
                      <CheckCircle2 className="w-3 h-3" />
                      Verified
                    </div>
                  </div>
                </div>

                {/* Content Body */}
                <div className="p-6 md:p-10 flex flex-col flex-1 relative z-20">
                  <h3 className="text-2xl md:text-3xl font-black mb-2 md:mb-4 text-brand-text group-hover:text-primary transition-colors uppercase tracking-tighter leading-none">{service.name}</h3>
                  <p className="text-brand-text/40 mb-6 md:mb-10 line-clamp-2 text-xs md:sm font-medium leading-relaxed italic">{service.description}</p>

                  <div className="mt-auto">
                    <div className="flex items-end justify-between mb-6 md:mb-8">
                      <div>
                        <span className="text-[8px] text-brand-text/20 block uppercase tracking-[0.4em] font-black mb-1">Global Access</span>
                        <div className="flex items-baseline gap-1">
                          <span className="text-[10px] text-brand-text/40 font-bold">$</span>
                          <span className="text-3xl md:text-4xl font-black text-brand-text tracking-tighter">{service.price}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-emerald-400 font-black uppercase tracking-widest block bg-emerald-400/10 px-3 py-1 rounded-lg">Instant</span>
                      </div>
                    </div>

                    <div className="flex gap-3 relative z-30">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); addToCart({ ...service, quantity: 1, id: service.id || service.name }); }}
                        className="flex-1 bg-white/5 hover:bg-white/10 py-3 md:py-4 rounded-2xl border border-white/5 flex items-center justify-center gap-2 md:gap-3 transition-all group/btn"
                      >
                        <ShoppingCart className="w-4 h-4 text-brand-text/20 group-hover/btn:text-primary transition-colors" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-text/40 group-hover/btn:text-brand-text">Cart</span>
                      </motion.button>

                      <Link href={`/services/${service.name.toLowerCase().replace(/ /g, '-')}`} className="flex-[2]">
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className="w-full bg-primary text-black py-3 md:py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-2 md:gap-3 border-b-4 border-secondary shadow-xl shadow-primary/10 group/order"
                        >
                          <Zap className="w-4 h-4 fill-current transition-transform group-hover/order:scale-125" />
                          <span>Buy Now</span>
                        </motion.button>
                      </Link>
                    </div>
                  </div>
                </div>

                {/* Aesthetic Inner Glow */}
                <div className="absolute inset-[1px] rounded-[2rem] md:rounded-[3rem] border border-white/5 pointer-events-none -z-10" />

              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Empty State */}
        {filteredServices.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-40 flex flex-col items-center"
          >
            <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-8 border border-white/5">
              <Search className="w-8 h-8 text-brand-text/10" />
            </div>
            <h3 className="text-2xl font-black uppercase tracking-tighter text-brand-text mb-4">No Products Found</h3>
            <p className="text-brand-text/40 font-medium">Try adjusting your search query.</p>
          </motion.div>
        )}
      </div>
    </section>
  );
};

export default ServicesSection;
