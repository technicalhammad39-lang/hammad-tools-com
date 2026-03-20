'use client';

import React from 'react';
import { motion } from 'motion/react';
import { Calendar, Share2, ArrowLeft, Tag } from 'lucide-react';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import Link from 'next/link';
import Image from 'next/image';

interface BlogPost {
  id: string;
  title: string;
  content: string;
  thumbnail: string;
  author: string;
  createdAt: any;
  category: string;
  tags: string[];
}

export default function BlogDetailClient({ post, loading }: { post: BlogPost | null, loading: boolean }) {
  if (loading) return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center">
      <div className="flex flex-col items-center space-y-6">
        <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        <p className="text-brand-text/40 font-black uppercase tracking-widest text-xs">Accessing Intel...</p>
      </div>
    </div>
  );

  if (!post) return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center p-4 text-center">
      <div>
        <h1 className="text-4xl font-black text-brand-text mb-6 uppercase">Transmission <span className="text-accent">Lost</span></h1>
        <p className="text-brand-text/60 mb-10 max-w-md mx-auto">The article you're looking for has been archived or doesn't exist in our current timeline.</p>
        <Link href="/blog" className="bg-primary text-black px-10 py-4 rounded-2xl font-black uppercase tracking-widest border-b-4 border-[#FF8C2A] shadow-xl shadow-primary/10 inline-block hover:scale-105 transition-all">
          Return to Blog
        </Link>
      </div>
    </div>
  );

  return (
    <div className="pt-32 pb-24 min-h-screen relative overflow-hidden">
      {/* Background Decorative */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 blur-[120px] -z-10 rounded-full" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-secondary/5 blur-[120px] -z-10 rounded-full" />
      <div className="absolute top-1/4 left-0 w-full h-[1px] bg-white/5 cyber-grid h-96 -z-10" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link href="/blog" className="inline-flex items-center space-x-3 text-brand-text/40 hover:text-primary transition-all mb-12 group">
          <div className="w-10 h-10 glass rounded-xl flex items-center justify-center group-hover:-translate-x-1 transition-transform border border-white/5">
            <ArrowLeft className="w-4 h-4" />
          </div>
          <span className="font-black uppercase tracking-widest text-[10px]">Back to Insights</span>
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="mb-12">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="px-6 py-2 bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest rounded-xl inline-block mb-6"
            >
              {post.category}
            </motion.div>
            
            <h1 className="text-5xl md:text-7xl font-black mb-8 leading-[0.9] text-brand-text uppercase">
              {post.title.split(' ').slice(0, -1).join(' ')} <span className="internal-gradient">{post.title.split(' ').slice(-1)}</span>
            </h1>
            
            <div className="flex flex-wrap items-center gap-8 text-brand-text/40 border-y border-white/5 py-8">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center p-0.5 overflow-hidden">
                  <Image 
                    src={`https://ui-avatars.com/api/?name=${post.author}&background=FFD600&color=000`} 
                    alt={post.author} 
                    width={48} 
                    height={48}
                    className="rounded-xl object-cover"
                  />
                </div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest mb-1 text-brand-text/20">Written By</div>
                  <div className="text-sm font-black text-brand-text uppercase">{post.author}</div>
                </div>
              </div>
              
              <div className="h-10 w-px bg-white/5 hidden md:block" />
              
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest mb-1 text-brand-text/20">Published</div>
                  <div className="text-sm font-black text-brand-text uppercase">{post.createdAt ? format(post.createdAt.toDate ? post.createdAt.toDate() : post.createdAt, 'MMMM dd, yyyy') : 'Recently'}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="relative mb-16 group">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary/50 to-secondary/50 rounded-[3rem] blur-xl opacity-20 group-hover:opacity-40 transition-opacity duration-500" />
            <div className="rounded-[3rem] overflow-hidden aspect-video relative border border-white/10 glow-box">
              <Image 
                src={post.thumbnail || 'https://picsum.photos/seed/blog/1200/800'} 
                alt={post.title}
                fill
                className="object-cover transition-transform duration-1000 group-hover:scale-105"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>

          <div className="glass rounded-[3rem] p-8 md:p-16 border border-white/5 mb-16">
            <div className="prose prose-invert prose-primary max-w-none 
              prose-headings:font-black prose-headings:uppercase prose-headings:text-brand-text
              prose-p:text-brand-text/70 prose-p:leading-relaxed prose-p:text-lg
              prose-strong:text-primary prose-a:text-primary prose-a:no-underline hover:prose-a:underline
              prose-img:rounded-[2rem] prose-img:border prose-img:border-white/10
              prose-img:mx-auto
              prose-pre:bg-black/50 prose-pre:border prose-pre:border-white/5 prose-pre:rounded-2xl
            ">
              <ReactMarkdown>{post.content}</ReactMarkdown>
            </div>
          </div>

          <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-10">
            <div className="flex flex-wrap gap-4">
              {post.tags?.map(tag => (
                <div key={tag} className="flex items-center space-x-2 glass px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-brand-text/60 border border-white/5 hover:border-primary/30 transition-all cursor-default">
                  <Tag className="w-3.5 h-3.5 text-primary" />
                  <span>{tag}</span>
                </div>
              ))}
            </div>
            
            <div className="flex items-center space-x-6">
              <span className="text-[10px] font-black uppercase tracking-widest text-brand-text/20">Share Intel:</span>
              <div className="flex space-x-3">
                <button className="w-12 h-12 glass rounded-2xl flex items-center justify-center hover:bg-primary/20 transition-all border border-white/5 hover:border-primary/30 text-brand-text">
                  <Share2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
