'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Image from 'next/image';
import { 
  Gift, 
  Timer, 
  Users, 
  Trophy, 
  ExternalLink, 
  MessageSquare, 
  Heart, 
  Send,
  MoreHorizontal,
  Share2,
  ThumbsUp,
  Globe,
  Verified
} from 'lucide-react';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, increment, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';

interface Giveaway {
  id: string;
  title: string;
  description: string;
  status: string;
  endsIn: string;
  participants: number;
  winners: number;
  image: string;
  requirements: string[];
  likes?: number;
  commentCount?: number;
}

const mockGiveaways: Giveaway[] = [
  {
    id: 'mock-1',
    title: 'Netflix Premium 1 Year Subscription',
    description: 'Win a full year of Netflix Premium with 4K support and 4 simultaneous screens. Perfect for binge-watching your favorite shows in the highest quality.',
    status: 'Active',
    endsIn: '2 Days',
    participants: 1240,
    winners: 5,
    image: 'https://picsum.photos/seed/netflix-giveaway/800/600',
    requirements: ['Follow on Twitter', 'Join Discord'],
    likes: 124,
    commentCount: 45
  },
  {
    id: 'mock-2',
    title: 'ChatGPT Plus Monthly Account',
    description: 'Get access to GPT-4 and the latest AI features for free for one month. Ideal for students and professionals looking to boost productivity.',
    status: 'Active',
    endsIn: '5 Hours',
    participants: 850,
    winners: 10,
    image: 'https://picsum.photos/seed/ai-giveaway/800/600',
    requirements: ['Subscribe to Newsletter'],
    likes: 89,
    commentCount: 22
  }
];

const GiveawayPost = ({ giveaway }: { giveaway: Giveaway }) => {
  const { user, profile } = useAuth();
  const [liked, setLiked] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [localComments, setLocalComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState('');

  useEffect(() => {
    if (!giveaway.id.startsWith('mock-')) {
        const commentsQ = query(
            collection(db, `giveaways/${giveaway.id}/comments`),
            orderBy('createdAt', 'desc')
        );
        return onSnapshot(commentsQ, (snapshot) => {
            setLocalComments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
    }
  }, [giveaway.id]);

  const handleLike = async () => {
    if (liked) return;
    setLiked(true);
    if (!giveaway.id.startsWith('mock-')) {
        await updateDoc(doc(db, 'giveaways', giveaway.id), {
            likes: increment(1)
        });
    }
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    
    if (!giveaway.id.startsWith('mock-')) {
        await addDoc(collection(db, `giveaways/${giveaway.id}/comments`), {
            text: commentText,
            userName: profile?.displayName || 'User',
            userPhoto: profile?.photoURL || '',
            createdAt: serverTimestamp()
        });
        await updateDoc(doc(db, 'giveaways', giveaway.id), {
            commentCount: increment(1)
        });
    } else {
        setLocalComments([{ text: commentText, userName: 'You', createdAt: { toDate: () => new Date() } }, ...localComments]);
    }
    setCommentText('');
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-2xl border border-white/5 bg-[#1C1C1E]/50 overflow-hidden shadow-2xl mb-8 group"
    >
      {/* Post Header */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full border border-primary/20 p-0.5">
            <div className="w-full h-full rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
               <Image src="/logo.png" alt="Admin" width={40} height={40} className="object-cover" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1">
               <span className="text-sm font-black text-brand-text flex items-center gap-1">Hammad Tools <Verified className="w-3 h-3 text-primary fill-primary" /></span>
               <span className="text-[10px] text-primary/60 font-black uppercase tracking-widest">• Mission Intel</span>
            </div>
            <div className="flex items-center gap-1 text-[9px] text-brand-text/30 font-black uppercase">
               <span>Recently</span>
               <span>•</span>
               <Globe className="w-2.5 h-2.5" />
            </div>
          </div>
        </div>
        <button className="p-2 text-brand-text/30 hover:text-brand-text transition-colors">
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>

      {/* Post Content */}
      <div className="px-4 pb-4">
        <h2 className="text-xl font-black text-brand-text uppercase leading-none mb-3 group-hover:text-primary transition-colors">
          {giveaway.title}
        </h2>
        <p className="text-brand-text/60 text-sm leading-relaxed mb-4">
          {giveaway.description}
        </p>
      </div>

      {/* Post Media */}
      <div className="relative aspect-[1.91/1] w-full border-y border-white/5 bg-black/20 overflow-hidden">
        <Image 
          src={giveaway.image} 
          alt={giveaway.title} 
          fill 
          className="object-cover transition-transform duration-1000 group-hover:scale-105"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent" />
        
        <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between">
           <div className="flex gap-4">
              <div className="glass px-4 py-2 rounded-xl flex items-center gap-2 border border-white/10">
                 <Timer className="w-4 h-4 text-primary" />
                 <span className="text-[10px] font-black text-brand-text uppercase">{giveaway.endsIn} Left</span>
              </div>
              <div className="glass px-4 py-2 rounded-xl flex items-center gap-2 border border-white/10">
                 <Users className="w-4 h-4 text-secondary" />
                 <span className="text-[10px] font-black text-brand-text uppercase">{giveaway.participants} Joined</span>
              </div>
           </div>
           
           <button 
             onClick={() => alert('Entry registered!')}
             className="bg-primary text-black px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl border-b-4 border-[#FF8C2A] transform active:scale-95 transition-all"
           >
              Enter Now
           </button>
        </div>
      </div>

      {/* Social Feedback Bar */}
      <div className="p-4 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-1.5 cursor-pointer hover:underline group/likes">
           <div className="flex -space-x-1.5">
              <div className="w-5 h-5 rounded-full bg-accent flex items-center justify-center border border-brand-bg relative z-20">
                 <Heart className="w-2.5 h-2.5 text-white fill-white" />
              </div>
              <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center border border-brand-bg relative z-10">
                 <ThumbsUp className="w-2.5 h-2.5 text-black fill-black" />
              </div>
           </div>
           <span className="text-[11px] font-black text-brand-text/40">{giveaway.likes || 0}</span>
        </div>
        <div className="flex items-center gap-3 text-[11px] font-black text-brand-text/40">
           <span className="hover:underline cursor-pointer" onClick={() => setShowComments(!showComments)}>{giveaway.commentCount || 0} Comments</span>
           <span>•</span>
           <span className="hover:underline cursor-pointer">12 Shares</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="px-2 py-1 flex items-center text-brand-text/60">
        <button 
          onClick={handleLike}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl hover:bg-white/5 transition-all font-black uppercase text-[10px] tracking-widest ${liked ? 'text-primary' : ''}`}
        >
          {liked ? <ThumbsUp className="w-4 h-4 fill-primary" /> : <ThumbsUp className="w-4 h-4" />}
          <span>Like Post</span>
        </button>
        <button 
          onClick={() => setShowComments(!showComments)}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl hover:bg-white/5 transition-all font-black uppercase text-[10px] tracking-widest"
        >
          <MessageSquare className="w-4 h-4" />
          <span>Comment</span>
        </button>
        <button className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl hover:bg-white/5 transition-all font-black uppercase text-[10px] tracking-widest">
          <Share2 className="w-4 h-4" />
          <span>Share</span>
        </button>
      </div>

      {/* Comments Section */}
      <AnimatePresence>
        {showComments && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden bg-black/10"
          >
            <div className="p-4 space-y-4 border-t border-white/5 max-h-[300px] overflow-y-auto no-scrollbar">
               {localComments.map((comment, i) => (
                 <div key={i} className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/5 flex-shrink-0 border border-white/10 overflow-hidden">
                       <Image 
                        src={comment.userPhoto || `https://ui-avatars.com/api/?name=${comment.userName}`} 
                        alt={comment.userName} 
                        width={32} height={32} 
                        className="object-cover"
                       />
                    </div>
                    <div className="bg-white/5 rounded-[1.25rem] px-4 py-2.5 flex-1 relative">
                       <div className="text-[10px] font-black text-brand-text uppercase mb-1">{comment.userName}</div>
                       <p className="text-xs text-brand-text/60 leading-relaxed">{comment.text}</p>
                       <div className="text-[9px] text-brand-text/20 font-black uppercase mt-2">{comment.createdAt?.toDate?.()?.toLocaleDateString() || 'Recently'}</div>
                    </div>
                 </div>
               ))}
            </div>

            {/* Comment Input */}
            <form onSubmit={handleComment} className="p-4 border-t border-white/5 flex items-center gap-3">
               <div className="w-8 h-8 rounded-full border border-primary/20 overflow-hidden flex-shrink-0">
                  <Image 
                    src={profile?.photoURL || `https://ui-avatars.com/api/?name=${profile?.displayName}`} 
                    alt="You" width={32} height={32} className="object-cover" 
                  />
               </div>
               <div className="flex-1 relative">
                  <input 
                    type="text" 
                    placeholder="Write a public comment..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-full py-2.5 px-6 text-xs text-brand-text focus:outline-none focus:border-primary/50"
                  />
                  <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 p-2 hover:text-primary transition-colors">
                     <Send className="w-4 h-4" />
                  </button>
               </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default function GiveawayPageClient() {
  const [giveaways, setGiveaways] = useState<Giveaway[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'giveaways'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (snapshot.empty) {
        setGiveaways(mockGiveaways);
      } else {
        const giveawaysData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Giveaway[];
        setGiveaways(giveawaysData);
      }
      setLoading(false);
    }, (error) => {
      console.error('Giveaway Fetch Error:', error);
      setGiveaways(mockGiveaways);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen pt-24 md:pt-32 pb-20 px-4 bg-brand-bg flex items-center justify-center">
         <div className="flex flex-col items-center gap-6">
            <div className="w-20 h-20 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            <p className="text-brand-text/40 font-black uppercase tracking-widest text-xs">Syncing Rewards...</p>
         </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pt-24 md:pt-32 pb-20 px-4 bg-brand-bg relative overflow-hidden">
      <div className="max-w-3xl mx-auto">
        {/* Feed Header */}
        <div className="flex items-center justify-between mb-12">
           <div>
              <h1 className="text-4xl font-black uppercase text-brand-text">Mission <span className="internal-gradient">Feed</span></h1>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-text/30">Hammad Tools Reward Protocol v2.0</p>
           </div>
           <div className="flex -space-x-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="w-10 h-10 rounded-full border-2 border-brand-bg bg-white/5 overflow-hidden">
                   <Image src={`https://i.pravatar.cc/100?img=${i+10}`} alt="Active User" width={40} height={40} />
                </div>
              ))}
              <div className="w-10 h-10 rounded-full border-2 border-brand-bg bg-primary flex items-center justify-center text-[10px] font-black text-black">
                 +12k
              </div>
           </div>
        </div>

        {/* Create Post Style Banner */}
        <div className="glass p-4 md:p-6 rounded-2xl border border-white/5 bg-[#1C1C1E]/50 mb-12 flex items-center gap-4">
           <div className="w-10 h-10 md:w-12 md:h-12 rounded-full border border-primary/20 p-0.5 relative">
              <div className="w-full h-full rounded-full bg-primary/10 flex items-center justify-center">
                 <Trophy className="w-5 h-5 md:w-6 md:h-6 text-primary" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 md:w-5 md:h-5 bg-emerald-500 rounded-full border-2 border-brand-bg flex items-center justify-center">
                 <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
              </div>
           </div>
           <div className="flex-1 bg-white/5 rounded-full py-2 md:py-3 px-6 text-brand-text/30 text-xs md:text-sm font-medium border border-white/5">
              What's on your mind? Deploy a new tool today...
           </div>
        </div>

        {/* The Feed */}
        <div className="space-y-4">
           {giveaways.map((item) => (
             <GiveawayPost key={item.id} giveaway={item} />
           ))}
        </div>

        {/* Footer Info */}
        <div className="text-center mt-20 opacity-20 hover:opacity-100 transition-opacity">
           <p className="text-[10px] font-black uppercase tracking-[0.5em] text-brand-text">End of Secure Feed</p>
        </div>
      </div>
    </main>
  );
}
