'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Calendar, User, ArrowRight, Search, Tag } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { collection, onSnapshot, query, orderBy, where } from 'firebase/firestore';
import { db } from '@/firebase';
import { useAuth } from '@/context/AuthContext';
import { handleFirestoreError, OperationType } from '@/lib/firebase-utils';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  category: string;
  author: string;
  date: any;
  thumbnail: string;
}

const mockPosts: BlogPost[] = [
  {
    id: 'mock-1',
    title: 'How to Maximize Your Productivity with AI Tools',
    slug: 'how-to-maximize-productivity-ai',
    excerpt: 'Discover the best AI-powered tools that can help you save hours every week and streamline your workflow.',
    category: 'Tools',
    author: 'Admin',
    date: 'March 15, 2026',
    thumbnail: 'https://picsum.photos/seed/blog1/800/600'
  },
  {
    id: 'mock-2',
    title: 'The Future of Digital Subscriptions in 2026',
    slug: 'future-of-digital-subscriptions-2026',
    excerpt: 'Trends are shifting towards bundled services and enterprise-level access for individuals. Here is what to expect.',
    category: 'Trends',
    author: 'Admin',
    date: 'March 12, 2026',
    thumbnail: 'https://picsum.photos/seed/blog2/800/600'
  }
];

const BlogPage = () => {
  const { isAdmin } = useAuth();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  useEffect(() => {
    let q = query(
      collection(db, 'blogPosts'), 
      orderBy('createdAt', 'desc')
    );

    if (!isAdmin) {
      q = query(
        collection(db, 'blogPosts'), 
        where('published', '==', true),
        orderBy('createdAt', 'desc')
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (snapshot.empty) {
        setPosts(mockPosts);
      } else {
        const postsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as any[];
        setPosts(postsData.map(p => ({
          ...p,
          date: p.createdAt?.toDate().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) || 'Recently'
        })));
      }
      setLoading(false);
    }, (error) => {
      console.error('Blog Fetch Error:', error);
      setPosts(mockPosts);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isAdmin]);

  const filteredPosts = posts.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          post.excerpt.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || post.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <main className="min-h-screen pt-24 md:pt-32 pb-20 px-4 bg-brand-bg">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass rounded-2xl overflow-hidden border border-white/10 h-[500px] animate-pulse">
                <div className="h-64 bg-white/5" />
                <div className="p-8 space-y-4">
                  <div className="h-4 bg-white/5 w-1/2 rounded" />
                  <div className="h-8 bg-white/10 w-full rounded" />
                  <div className="h-4 bg-white/5 w-full rounded" />
                  <div className="h-4 bg-white/5 w-2/3 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pt-20 md:pt-24 pb-20 px-4 bg-brand-bg">
    <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 md:mb-12">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-7xl lg:text-8xl font-black uppercase tracking-tighter mb-4 text-brand-text md:whitespace-nowrap"
          >
            <span className="font-serif italic text-white normal-case">Latest</span> <span className="internal-gradient">Blogs</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-brand-text/60 max-w-2xl mx-auto text-base md:text-lg mt-2"
          >
            Stay updated with the latest trends in digital tools, design, and productivity.
          </motion.p>
        </div>

        {/* Search & Filter */}
        <div className="flex flex-col md:flex-row gap-6 mb-12">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-text/40 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Search articles..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:border-primary/50 transition-colors text-brand-text"
            />
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
            {['All', 'Productivity', 'Design', 'Tools', 'Tutorials'].map((cat) => (
              <button 
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-6 py-3 rounded-xl glass border ${selectedCategory === cat ? 'border-primary text-primary' : 'border-white/10 text-brand-text'} text-sm font-black uppercase tracking-widest hover:border-primary/50 transition-all whitespace-nowrap`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Blog Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredPosts.map((post, index) => (
            <motion.article
              key={post.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="group glass rounded-[2.5rem] overflow-hidden border border-white/5 hover:border-primary/30 transition-all duration-500 flex flex-col relative"
            >
              <Link 
                href={`/blog/${post.slug || post.id}`}
                className="absolute inset-0 z-10"
                aria-label={`Read ${post.title}`}
              />
              {/* Image */}
              <div className="relative h-48 md:h-64 overflow-hidden">
                <Image 
                  src={post.thumbnail || 'https://picsum.photos/seed/blog/800/600'} 
                  alt={post.title}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-110"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-transparent to-transparent opacity-80" />
                <div className="absolute top-6 left-6">
                  <span className="px-4 py-1.5 bg-primary/20 backdrop-blur-md text-primary text-[10px] font-black uppercase tracking-widest rounded-xl border border-primary/20">
                    {post.category}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="p-10 flex-1 flex flex-col">
                <div className="flex items-center gap-4 text-[10px] text-brand-text/20 mb-6 font-black uppercase tracking-widest">
                  <span className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-primary" />
                    {post.date}
                  </span>
                  <div className="w-1 h-1 rounded-full bg-white/10" />
                  <span className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-secondary" />
                    {post.author}
                  </span>
                </div>
                
                <h2 className="text-xl md:text-2xl font-black mb-3 group-hover:text-primary transition-colors leading-tight text-brand-text uppercase tracking-tighter">
                  {post.title}
                </h2>
                
                <p className="text-brand-text/50 text-sm mb-10 line-clamp-3 font-medium leading-relaxed">
                  {post.excerpt}
                </p>

                <div className="mt-auto">
                  <div className="w-full glass py-4 rounded-xl flex items-center justify-center gap-3 text-brand-text font-black uppercase tracking-widest text-[10px] border border-white/5 relative z-20 group-hover:bg-primary group-hover:text-black transition-all">
                    Read More 
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </div>
            </motion.article>
          ))}
        </div>

        {/* Pagination */}
        <div className="mt-16 flex justify-center gap-4">
          <button className="w-12 h-12 rounded-xl glass border border-white/10 flex items-center justify-center font-black hover:border-primary/50 transition-all text-brand-text">1</button>
          <button className="w-12 h-12 rounded-xl glass border border-white/10 flex items-center justify-center font-black hover:border-primary/50 transition-all opacity-50 text-brand-text">2</button>
          <button className="w-12 h-12 rounded-xl glass border border-white/10 flex items-center justify-center font-black hover:border-primary/50 transition-all opacity-50 text-brand-text">3</button>
        </div>
      </div>
    </main>
  );
};

export default BlogPage;
