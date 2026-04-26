'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Image from 'next/image';
import {
  Timer,
  Users,
  Trophy,
  MessageSquare,
  Heart,
  Send,
  MoreHorizontal,
  Share2,
  ThumbsUp,
  Globe,
  Verified,
} from 'lucide-react';
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  limit,
  doc,
  updateDoc,
  addDoc,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  getDocs,
  where,
  increment,
} from 'firebase/firestore';
import { db } from '@/firebase';
import { useAuth } from '@/context/AuthContext';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { usePathname, useRouter } from 'next/navigation';
import { useToast } from '@/components/ToastProvider';
import { resolveImageSource } from '@/lib/image-display';
import type { StoredFileMetadata } from '@/lib/types/domain';
import UploadedImage from '@/components/UploadedImage';

interface Giveaway {
  id: string;
  title: string;
  description: string;
  status: string;
  endDate: any;
  participantsCount: number;
  winnersCount: number;
  image?: string;
  imageMedia?: StoredFileMetadata | null;
  likedBy?: string[];
  commentCount?: number;
  adminAvatar?: string;
  adminName?: string;
}

interface ProfilePreview {
  id: string;
  photoURL?: string;
  displayName?: string;
}

const GiveawayPost = ({ giveaway }: { giveaway: Giveaway }) => {
  const { user, profile } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();
  const liked = user ? (giveaway.likedBy || []).includes(user.uid) : false;
  const [showComments, setShowComments] = useState(false);
  const [localComments, setLocalComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState('');
  const [joining, setJoining] = useState(false);

  const redirectToLogin = () => {
    const nextPath = pathname || '/giveaway';
    router.push(`/login?next=${encodeURIComponent(nextPath)}`);
  };

  useEffect(() => {
    const commentsQ = query(
      collection(db, `giveaways/${giveaway.id}/comments`),
      orderBy('createdAt', 'desc')
    );
    return onSnapshot(commentsQ, (snapshot) => {
      setLocalComments(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
  }, [giveaway.id]);

  const handleLike = async () => {
    if (!user) {
      redirectToLogin();
      return;
    }

    const giveawayRef = doc(db, 'giveaways', giveaway.id);
    try {
      if (liked) {
        await updateDoc(giveawayRef, {
          likedBy: arrayRemove(user.uid),
        });
      } else {
        await updateDoc(giveawayRef, {
          likedBy: arrayUnion(user.uid),
        });
      }
    } catch (error) {
      console.error('Like error:', error);
    }
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !user) {
      if (!user) {
        redirectToLogin();
      }
      return;
    }

    try {
      await addDoc(collection(db, `giveaways/${giveaway.id}/comments`), {
        text: commentText,
        userName: profile?.displayName || 'User',
        userPhoto: profile?.photoURL || '',
        userId: user.uid,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Comment error:', error);
      toast.error('Failed to post comment');
    }
    setCommentText('');
  };

  const handleJoin = async () => {
    if (!user) {
      redirectToLogin();
      return;
    }
    if (joining) {
      return;
    }

    setJoining(true);
    try {
      const entryQuery = query(
        collection(db, `giveaways/${giveaway.id}/entries`),
        where('userId', '==', user.uid)
      );
      const existing = await getDocs(entryQuery);
      if (!existing.empty) {
        toast.info('Already joined', 'You are already entered in this giveaway.');
        return;
      }

      await addDoc(collection(db, `giveaways/${giveaway.id}/entries`), {
        userId: user.uid,
        userName: profile?.displayName || user.email || 'User',
        userEmail: user.email || '',
        createdAt: serverTimestamp(),
      });
      await addDoc(collection(db, 'user_entries'), {
        userId: user.uid,
        giveawayId: giveaway.id,
        giveawayTitle: giveaway.title,
        createdAt: serverTimestamp(),
      });
      await updateDoc(doc(db, 'giveaways', giveaway.id), {
        participantsCount: increment(1),
      });

      toast.success('Entry confirmed', 'You have been added to the giveaway.');
    } catch (error) {
      console.error('Entry error:', error);
      toast.error('Failed to join giveaway', 'Please try again.');
    } finally {
      setJoining(false);
    }
  };

  const handleShare = async () => {
    const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
    const shareText = `Check out this giveaway: ${giveaway.title}`;

    try {
      if (navigator.share) {
        await navigator.share({ title: giveaway.title, text: shareText, url: shareUrl });
        toast.success('Shared successfully');
        return;
      }
      if (shareUrl) {
        await navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
        toast.success('Link copied');
      }
    } catch (error) {
      console.error('Share failed:', error);
      toast.error('Share failed', 'Please try again.');
    }
  };

  const endDateMs = giveaway.endDate?.toDate?.()?.getTime?.();
  const remainingDays = endDateMs
    ? Math.ceil((endDateMs - Date.now()) / (1000 * 60 * 60 * 24))
    : null;
  const giveawayImageSrc = resolveImageSource(giveaway, {
    mediaPaths: ['imageMedia'],
    stringPaths: ['image'],
    placeholder: '/services-card.webp',
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-2xl border border-white/5 bg-[#1C1C1E]/50 overflow-hidden shadow-2xl mb-8 group"
    >
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full border border-primary/20 p-0.5">
            <div className="w-full h-full rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
              <Image
                src={giveaway.adminAvatar || '/logo-header.png'}
                alt="Admin"
                width={40}
                height={40}
                className="object-cover"
              />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1">
              <span className="text-sm font-black text-brand-text flex items-center gap-1">
                {giveaway.adminName || 'Hammad Tools'}
                <Verified className="w-3 h-3 text-primary fill-primary" />
              </span>
              <span className="text-[10px] text-primary/60 font-black uppercase tracking-widest">Official Update</span>
            </div>
            <div className="flex items-center gap-1 text-[9px] text-brand-text/30 font-black uppercase">
              <Globe className="w-2.5 h-2.5" />
              <span>Public Post</span>
            </div>
          </div>
        </div>
        <button className="p-2 text-brand-text/30 hover:text-brand-text transition-colors">
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>

      <div className="px-4 pb-4">
        <h2 className="text-xl font-black text-brand-text uppercase leading-none mb-3 group-hover:text-primary transition-colors">
          {giveaway.title}
        </h2>
        <div
          className="prose prose-invert prose-primary max-w-none
          prose-p:text-brand-text/60 prose-p:text-sm prose-p:leading-relaxed
          prose-a:text-blue-500 prose-a:underline cursor-pointer"
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{giveaway.description}</ReactMarkdown>
        </div>
      </div>

      <div className="relative aspect-[1.91/1] w-full border-y border-white/5 bg-black/20 overflow-hidden">
        <UploadedImage
          src={giveawayImageSrc}
          fallbackSrc="/services-card.webp"
          alt={giveaway.title}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent" />

        <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between">
          <div className="flex gap-4">
            <div className="glass px-4 py-2 rounded-xl flex items-center gap-2 border border-white/10">
              <Timer className="w-4 h-4 text-primary" />
              <span className="text-[10px] font-black text-brand-text uppercase">
                {remainingDays && remainingDays > 0 ? `${remainingDays} Days` : 'Ended'} Left
              </span>
            </div>
            <div className="glass px-4 py-2 rounded-xl flex items-center gap-2 border border-white/10">
              <Users className="w-4 h-4 text-secondary" />
              <span className="text-[10px] font-black text-brand-text uppercase">{giveaway.participantsCount || 0} Joined</span>
            </div>
          </div>
          <button
            onClick={handleJoin}
            disabled={joining}
            className="bg-primary text-black px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl border-b-4 border-[#FF8C2A] transform active:scale-95 transition-all disabled:opacity-60"
          >
            {joining ? 'Joining...' : 'Enter Now'}
          </button>
        </div>
      </div>

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
          <span className="text-[11px] font-black text-brand-text/40">{(giveaway.likedBy || []).length}</span>
        </div>
        <div className="flex items-center gap-3 text-[11px] font-black text-brand-text/40">
          <span>{localComments.length} Comments</span>
          <span className="opacity-40">|</span>
          <button onClick={handleShare} className="hover:underline cursor-pointer">Share</button>
        </div>
      </div>

      <div className="px-2 py-1 flex items-center text-brand-text/60">
        <button
          onClick={handleLike}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl hover:bg-white/5 transition-all font-black uppercase text-[10px] tracking-widest ${liked ? 'text-primary' : ''}`}
        >
          {liked ? <ThumbsUp className="w-4 h-4 fill-primary" /> : <ThumbsUp className="w-4 h-4" />}
          <span>{liked ? 'Liked' : 'Like Post'}</span>
        </button>
        <button
          onClick={() => setShowComments(!showComments)}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl hover:bg-white/5 transition-all font-black uppercase text-[10px] tracking-widest"
        >
          <MessageSquare className="w-4 h-4" />
          <span>Comment</span>
        </button>
        <button
          onClick={handleShare}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl hover:bg-white/5 transition-all font-black uppercase text-[10px] tracking-widest"
        >
          <Share2 className="w-4 h-4" />
          <span>Share</span>
        </button>
      </div>

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
                      width={32}
                      height={32}
                      className="object-cover"
                    />
                  </div>
                  <div className="bg-white/5 rounded-[1.25rem] px-4 py-2.5 flex-1 relative">
                    <div className="text-[10px] font-black text-brand-text uppercase mb-1">{comment.userName}</div>
                    <p className="text-xs text-brand-text/60 leading-relaxed">{comment.text}</p>
                    <div className="text-[9px] text-brand-text/20 font-black uppercase mt-2">
                      {comment.createdAt?.toDate?.()?.toLocaleDateString() || 'Recently'}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={handleComment} className="p-4 border-t border-white/5 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full border border-primary/20 overflow-hidden flex-shrink-0">
                <Image
                  src={profile?.photoURL || `https://ui-avatars.com/api/?name=${profile?.displayName}`}
                  alt="You"
                  width={32}
                  height={32}
                  className="object-cover"
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
  const [topProfiles, setTopProfiles] = useState<ProfilePreview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'giveaways'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const giveawaysData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Giveaway[];
        setGiveaways(giveawaysData);
        setLoading(false);
      },
      (error) => {
        console.error('Giveaway Fetch Error:', error);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const profilesQuery = query(collection(db, 'users'), limit(6));
    const unsubscribeProfiles = onSnapshot(
      profilesQuery,
      (snapshot) => {
        const list = snapshot.docs
          .map((doc) => ({
            id: doc.id,
            ...(doc.data() as Omit<ProfilePreview, 'id'>),
          }))
          .filter((entry) => Boolean((entry.photoURL || '').trim()))
          .slice(0, 4);
        setTopProfiles(list);
      },
      () => setTopProfiles([])
    );

    return () => unsubscribeProfiles();
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen page-navbar-spacing pb-20 px-4 bg-brand-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <div className="w-20 h-20 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-brand-text/40 font-black uppercase tracking-widest text-xs">Loading Giveaways...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen page-navbar-spacing pb-20 px-4 bg-brand-bg relative overflow-hidden">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          className="flex items-center justify-between mb-10"
        >
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-4xl font-black uppercase text-brand-text whitespace-nowrap truncate">
              Giveaway <span className="internal-gradient">Feed</span>
            </h1>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-text/30">Latest public giveaways and winners updates</p>
          </div>
          <div className="flex -space-x-3 shrink-0">
            {topProfiles.map((profile) => (
              <div key={profile.id} className="w-10 h-10 rounded-full border-2 border-brand-bg bg-white/5 overflow-hidden">
                <UploadedImage
                  src={profile.photoURL || ''}
                  fallbackSrc={null}
                  fallbackOnError={false}
                  alt={profile.displayName || 'User'}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
            {!topProfiles.length ? null : (
              <div className="w-10 h-10 rounded-full border-2 border-brand-bg bg-primary flex items-center justify-center text-[10px] font-black text-black">
                +{topProfiles.length}
              </div>
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          className="space-y-4 mt-4"
        >
          {giveaways.map((item) => (
            <GiveawayPost key={item.id} giveaway={item} />
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          className="text-center mt-20 opacity-20 hover:opacity-100 transition-opacity"
        >
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-text">You reached the end</p>
        </motion.div>
      </div>
    </main>
  );
}
