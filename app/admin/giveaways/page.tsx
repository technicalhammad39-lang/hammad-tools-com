'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, Timestamp, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { Plus, Edit2, Trash2, Save, X, Gift, Calendar, Users, Trophy, Loader2, Image as ImageIcon } from 'lucide-react';
import Link from 'next/link';
import { deleteUploadedMedia, toStorageMetadataFromLibrary } from '@/lib/storage-utils';
import { logFirestoreSaveFailure, sanitizeForFirestore } from '@/lib/firestore-sanitize';
import type { StoredFileMetadata } from '@/lib/types/domain';
import { useToast } from '@/components/ToastProvider';
import { resolveImageSource } from '@/lib/image-display';
import UploadedImage from '@/components/UploadedImage';
import MediaLibraryModal from '@/components/MediaLibraryModal';

interface Giveaway {
  id: string;
  title: string;
  description: string;
  prize: string;
  endDate: Timestamp;
  winnersCount: number;
  status: 'active' | 'ended';
  participantsCount: number;
  image: string;
  imageMedia?: StoredFileMetadata | null;
  adminAvatar?: string;
  adminName?: string;
}

const AdminGiveaways = () => {
  const { user, isStaff } = useAuth();
  const toast = useToast();
  const [giveaways, setGiveaways] = useState<Giveaway[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isMediaLibraryOpen, setIsMediaLibraryOpen] = useState(false);
  const [form, setForm] = useState<Partial<Giveaway>>({
    title: '',
    description: '',
    prize: '',
    winnersCount: 1,
    status: 'active',
    image: '',
    imageMedia: null,
  });
  const formImageSrc = resolveImageSource(form, {
    mediaPaths: ['imageMedia'],
    stringPaths: ['image'],
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isStaff) return;

    const q = query(collection(db, 'giveaways'), orderBy('endDate', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Giveaway[];
      setGiveaways(data);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching giveaways:', error);
      toast.error('Failed to load giveaways');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isStaff]);

  const handleSave = async () => {
    if (!form.title || !form.prize) return;

    let rawPayloadForDebug: Record<string, unknown> | null = null;
    let finalPayloadForDebug: Record<string, unknown> | null = null;

    try {
      const data = {
        ...form,
        endDate: form.endDate || Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
        participantsCount: form.participantsCount || 0,
        updatedAt: serverTimestamp(),
        adminAvatar: user?.photoURL || '',
        adminName: user?.displayName || 'Admin'
      };
      rawPayloadForDebug = data as Record<string, unknown>;
      const sanitizedData = sanitizeForFirestore(data);
      finalPayloadForDebug = sanitizedData as Record<string, unknown>;

      if (editingId) {
        await updateDoc(doc(db, 'giveaways', editingId), sanitizedData);
        toast.success('Giveaway updated');
      } else {
        await addDoc(collection(db, 'giveaways'), sanitizeForFirestore({
          ...sanitizedData,
          createdAt: serverTimestamp(),
          likedBy: []
        }));
        toast.success('Giveaway created');
      }
      
      setIsAdding(false);
      setEditingId(null);
      setForm({
        title: '',
        description: '',
        prize: '',
        winnersCount: 1,
        status: 'active',
        image: '',
        imageMedia: null,
      });
    } catch (error) {
      logFirestoreSaveFailure({
        scope: 'admin-giveaways-save',
        collection: 'giveaways',
        payload: finalPayloadForDebug || rawPayloadForDebug,
        sanitized: Boolean(finalPayloadForDebug),
        error,
      });
      console.error('Error saving giveaway:', error);
      toast.error('Failed to save giveaway', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this giveaway?')) return;
    try {
      const target = giveaways.find((entry) => entry.id === id);
      const mediaId = target?.imageMedia?.mediaId || '';
      if (mediaId) {
        await deleteUploadedMedia(mediaId).catch((mediaError) => {
          console.warn('Giveaway image cleanup failed:', mediaError);
        });
      }
      await deleteDoc(doc(db, 'giveaways', id));
      toast.success('Giveaway deleted');
    } catch (error) {
      console.error('Error deleting giveaway:', error);
      toast.error('Failed to delete giveaway', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  if (!isStaff) {
    return (
      <div className="pt-32 pb-24 text-center">
        <h1 className="text-3xl font-bold">Access Denied</h1>
        <p className="mt-4">You do not have permission to view this page.</p>
        <Link href="/" className="text-primary mt-4 block">Return Home</Link>
      </div>
    );
  }

  return (
    <div className="pt-32 pb-24 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-4xl font-bold">Manage <span className="text-primary">Giveaways</span></h1>
            <p className="text-brand-text/60">Create and monitor giveaway events.</p>
          </div>
          <button 
            onClick={() => setIsAdding(true)}
            className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-xl font-bold flex items-center space-x-2 transition-all"
          >
            <Plus className="w-5 h-5" />
            <span>New Giveaway</span>
          </button>
        </div>

        {isAdding && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-3xl p-8 mb-12 border-primary/20"
          >
            <h2 className="text-2xl font-bold mb-6">{editingId ? 'Edit Giveaway' : 'Create Giveaway'}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <input 
                type="text" 
                placeholder="Giveaway Title"
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-primary"
                value={form.title}
                onChange={e => setForm({...form, title: e.target.value})}
              />
              <input 
                type="text" 
                placeholder="Prize"
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-primary"
                value={form.prize}
                onChange={e => setForm({...form, prize: e.target.value})}
              />
              <input 
                type="number" 
                placeholder="Winners Count"
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-primary"
                value={form.winnersCount}
                onChange={e => setForm({...form, winnersCount: Number(e.target.value)})}
              />
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 rounded-xl bg-white/5 border border-white/10 flex-shrink-0 relative overflow-hidden">
                  {formImageSrc ? (
                    <UploadedImage
                      src={formImageSrc}
                      fallbackSrc="/services-card.png"
                      alt="Preview"
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <ImageIcon className="w-6 h-6 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-brand-text/10" />
                  )}
                </div>
                <div className="flex-1">
                  <button
                    type="button"
                    onClick={() => setIsMediaLibraryOpen(true)}
                    className="inline-flex items-center space-x-2 bg-white/5 hover:bg-white/10 px-4 py-2 rounded-lg border border-white/10 transition-colors text-xs font-bold uppercase tracking-widest"
                  >
                    <ImageIcon className="w-4 h-4 text-primary" />
                    <span>Open Media Library</span>
                  </button>
                </div>
              </div>
            </div>
            <textarea 
              placeholder="Description"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-primary mb-6 h-32"
              value={form.description}
              onChange={e => setForm({...form, description: e.target.value})}
            />
            <div className="flex justify-end space-x-4">
              <button onClick={() => { setIsAdding(false); setEditingId(null); }} className="px-6 py-3 rounded-xl font-bold text-brand-text/60 hover:text-brand-text">Cancel</button>
              <button onClick={handleSave} className="bg-primary px-8 py-3 rounded-xl font-bold text-white">
                {editingId ? 'Push Update' : 'Launch Giveaway'}
              </button>
            </div>
          </motion.div>
        )}

        <div className="grid grid-cols-1 gap-6">
          {loading ? (
            <div className="text-center py-20">Loading giveaways...</div>
          ) : giveaways.map(giveaway => (
            <div key={giveaway.id} className="glass rounded-2xl p-6 border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center text-secondary">
                  <Gift className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">{giveaway.title}</h3>
                  <div className="flex items-center space-x-4 text-xs text-brand-text/40 mt-1">
                    <span className="flex items-center space-x-1">
                      <Users className="w-3 h-3" />
                      <span>{giveaway.participantsCount} Joined</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <Trophy className="w-3 h-3" />
                      <span>{giveaway.winnersCount} Winners</span>
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                      giveaway.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-accent/10 text-accent'
                    }`}>
                      {giveaway.status}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <button 
                  onClick={() => {
                    setForm({
                      title: giveaway.title,
                      description: giveaway.description,
                      prize: giveaway.prize,
                      winnersCount: giveaway.winnersCount,
                      status: giveaway.status,
                      image: resolveImageSource(giveaway, {
                        mediaPaths: ['imageMedia'],
                        stringPaths: ['image'],
                      }),
                      imageMedia: giveaway.imageMedia || null,
                      endDate: giveaway.endDate
                    });
                    setEditingId(giveaway.id);
                    setIsAdding(true);
                  }}
                  className="p-3 bg-primary/10 hover:bg-primary/20 rounded-xl text-primary transition-all"
                >
                  <Edit2 className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => handleDelete(giveaway.id)}
                  className="p-3 bg-accent/10 hover:bg-accent/20 rounded-xl text-accent transition-all"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <MediaLibraryModal
          open={isMediaLibraryOpen}
          onClose={() => setIsMediaLibraryOpen(false)}
          onSelect={(media) => {
            setForm((prev) => ({
              ...prev,
              image: media.url,
              imageMedia: toStorageMetadataFromLibrary(media),
            }));
          }}
          folder="services"
          title="Giveaway Media Library"
          description="Use existing giveaway assets or upload from device inside this library."
          accept="image/*"
          relatedType="giveaway"
          relatedId={editingId || ''}
          replaceMediaId={form.imageMedia?.mediaId || ''}
        />
      </div>
    </div>
  );
};

export default AdminGiveaways;
