'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/firebase';
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy, 
  onSnapshot,
  serverTimestamp 
} from 'firebase/firestore';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Save, 
  X, 
  Upload, 
  Loader2, 
  Image as ImageIcon, 
  ArrowLeft,
  Layout,
  Tag
} from 'lucide-react';
import Link from 'next/link';
import { deleteUploadedMedia, toStorageMetadata, uploadMediaFile } from '@/lib/storage-utils';
import { logFirestoreSaveFailure, sanitizeForFirestore } from '@/lib/firestore-sanitize';
import type { StoredFileMetadata } from '@/lib/types/domain';
import { useToast } from '@/components/ToastProvider';
import { resolveImageSource } from '@/lib/image-display';
import UploadedImage from '@/components/UploadedImage';

interface AgencyService {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  thumbnailMedia?: StoredFileMetadata | null;
  tags: string[];
  createdAt: any;
}

const ManageAgencyServices = () => {
  const { isStaff } = useAuth();
  const toast = useToast();
  const [services, setServices] = useState<AgencyService[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form State
  const [form, setForm] = useState({
    title: '',
    description: '',
    thumbnail: '',
    thumbnailMedia: null as StoredFileMetadata | null,
    tags: [] as string[]
  });
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    if (!isStaff) return;

    const q = query(collection(db, 'agency_services'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as AgencyService[];
      setServices(data);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching agency services:', error);
      toast.error('Failed to load agency services');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isStaff]);

  const handleEdit = (service: AgencyService) => {
    setEditingId(service.id);
    setForm({
      title: service.title,
      description: service.description,
      thumbnail: resolveImageSource(service, {
        mediaPaths: ['thumbnailMedia'],
        stringPaths: ['thumbnail'],
      }),
      thumbnailMedia: service.thumbnailMedia || null,
      tags: service.tags || []
    });
    setIsAdding(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) return;

    let rawPayloadForDebug: Record<string, unknown> | null = null;
    let finalPayloadForDebug: Record<string, unknown> | null = null;

    try {
      const serviceData = {
        ...form,
        updatedAt: serverTimestamp()
      };
      rawPayloadForDebug = serviceData as Record<string, unknown>;
      const sanitizedServiceData = sanitizeForFirestore(serviceData);
      finalPayloadForDebug = sanitizedServiceData as Record<string, unknown>;

      if (editingId) {
        await updateDoc(doc(db, 'agency_services', editingId), sanitizedServiceData);
        toast.success('Service updated');
      } else {
        await addDoc(collection(db, 'agency_services'), sanitizeForFirestore({
          ...sanitizedServiceData,
          createdAt: serverTimestamp()
        }));
        toast.success('Service created');
      }
      
      resetForm();
    } catch (error) {
      logFirestoreSaveFailure({
        scope: 'admin-agency-services-save',
        collection: 'agency_services',
        payload: finalPayloadForDebug || rawPayloadForDebug,
        sanitized: Boolean(finalPayloadForDebug),
        error,
      });
      console.error('Error saving agency service:', error);
      toast.error('Failed to save service', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this agency service?')) return;
    try {
      const target = services.find((entry) => entry.id === id);
      const mediaId = target?.thumbnailMedia?.mediaId || '';
      if (mediaId) {
        await deleteUploadedMedia(mediaId).catch((mediaError) => {
          console.warn('Agency thumbnail cleanup failed:', mediaError);
        });
      }
      await deleteDoc(doc(db, 'agency_services', id));
      toast.success('Service deleted');
    } catch (error) {
      console.error('Error deleting service:', error);
      toast.error('Failed to delete service', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  const resetForm = () => {
    setIsAdding(false);
    setEditingId(null);
    setForm({ title: '', description: '', thumbnail: '', thumbnailMedia: null, tags: [] });
    setNewTag('');
  };

  const addTag = () => {
    if (newTag.trim() && !form.tags.includes(newTag.trim())) {
      setForm({ ...form, tags: [...form.tags, newTag.trim()] });
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setForm({ ...form, tags: form.tags.filter(t => t !== tagToRemove) });
  };

  const formThumbnailSrc = resolveImageSource(form, {
    mediaPaths: ['thumbnailMedia'],
    stringPaths: ['thumbnail'],
  });

  if (!isStaff) {
    return (
      <div className="pt-32 pb-24 text-center">
        <h1 className="text-3xl font-bold uppercase">Access Denied</h1>
        <Link href="/" className="text-primary mt-4 block uppercase font-black text-xs">Return Home</Link>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl md:text-5xl font-black uppercase text-brand-text leading-tight">
            Manage <span className="text-primary">Agency Services</span>
          </h1>
          <p className="text-brand-text/40 text-[10px] md:text-sm font-black uppercase tracking-widest mt-2">Dynamic Control Hub for Elite Solutions</p>
        </div>
        <button 
          onClick={() => { setIsAdding(true); setEditingId(null); }}
          className="bg-primary text-brand-bg px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[11px] flex items-center justify-center gap-3 border-b-4 border-[#FF8C2A] shadow-xl shadow-primary/10 transition-all active:scale-95"
        >
          <Plus className="w-5 h-5" />
          <span>New Service</span>
        </button>
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="glass p-8 md:p-10 rounded-[2.5rem] border border-white/5 relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-8">
               <h2 className="text-2xl font-black uppercase text-brand-text">{editingId ? 'Edit Evolution' : 'Initialize New Asset'}</h2>
               <button onClick={resetForm} className="text-brand-text/40 hover:text-accent transition-colors">
                  <X className="w-6 h-6" />
               </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-brand-text/30 mb-2 ml-1">Service Title</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Logo Design"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-primary transition-all text-brand-text"
                    value={form.title}
                    onChange={e => setForm({...form, title: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-brand-text/30 mb-2 ml-1">Service Description</label>
                  <textarea 
                    placeholder="Describe the elite solution..."
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-primary transition-all text-brand-text h-32 resize-none"
                    value={form.description}
                    onChange={e => setForm({...form, description: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-brand-text/30 mb-2 ml-1">Dynamic Features / Tags</label>
                  <div className="flex gap-2 mb-4">
                    <input 
                      type="text" 
                      placeholder="Add tag..."
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-primary transition-all text-brand-text"
                      value={newTag}
                      onChange={e => setNewTag(e.target.value)}
                      onKeyPress={e => e.key === 'Enter' && addTag()}
                    />
                    <button 
                      onClick={addTag}
                      className="bg-primary/10 text-primary p-2 rounded-xl border border-primary/20 hover:bg-primary hover:text-brand-bg transition-all"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {form.tags.map((tag, i) => (
                      <span key={i} className="bg-white/5 border border-white/10 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-2 group">
                        {tag}
                        <button onClick={() => removeTag(tag)} className="text-accent opacity-0 group-hover:opacity-100 transition-opacity">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-8">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-brand-text/30 mb-4 ml-1">Visual Asset (Thumbnail)</label>
                  <div className="relative aspect-video rounded-[2rem] bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden group">
                    {formThumbnailSrc ? (
                      <>
                        <UploadedImage
                          src={formThumbnailSrc}
                          fallbackSrc="/services-card.png"
                          alt="Preview"
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <ImageIcon className="w-8 h-8 text-white" />
                        </div>
                      </>
                    ) : (
                      <ImageIcon className="w-12 h-12 text-brand-text/10" />
                    )}
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                     <div className="text-[9px] text-brand-text/30 font-bold uppercase tracking-widest">Recommended: 1280x720px • Max 2MB</div>
                     <label className="cursor-pointer bg-white/5 hover:bg-white/10 px-6 py-2.5 rounded-xl border border-white/10 transition-all flex items-center gap-2">
                        {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" /> : <Upload className="w-3.5 h-3.5 text-primary" />}
                        <span className="text-[10px] font-black uppercase tracking-widest">{uploading ? 'Processing...' : 'Upload Asset'}</span>
                        <input 
                          type="file" 
                          className="hidden" 
                          accept="image/*"
                          disabled={uploading}
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            setUploading(true);
                            setUploadProgress(20);
                            try {
                              const media = await uploadMediaFile({
                                file,
                                folder: 'services',
                                relatedType: 'agency_service',
                                relatedId: editingId || '',
                                replaceMediaId: form.thumbnailMedia?.mediaId || '',
                              });
                              setForm((prev) => ({
                                ...prev,
                                thumbnail: media.url,
                                thumbnailMedia: toStorageMetadata(media),
                              }));
                              setUploadProgress(100);
                            } catch (error) {
                              const message =
                                error instanceof Error ? error.message : 'Unable to upload thumbnail.';
                              toast.error('Upload failed', message);
                            } finally {
                              setUploading(false);
                              setUploadProgress(0);
                            }
                          }}
                        />
                     </label>
                  </div>
                  {uploading && (
                    <div className="mt-4 h-1.5 bg-white/5 rounded-full overflow-hidden">
                       <motion.div 
                         initial={{ width: 0 }}
                         animate={{ width: `${uploadProgress}%` }}
                         className="h-full bg-primary"
                       />
                    </div>
                  )}
                </div>

                <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row gap-4">
                   <button 
                    onClick={handleSave}
                    disabled={uploading || !form.title.trim()}
                    className="flex-1 bg-primary text-brand-bg py-5 rounded-2xl font-black uppercase tracking-widest text-xs border-b-4 border-[#FF8C2A] shadow-xl shadow-primary/10 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
                   >
                     <Save className="w-5 h-5" />
                     <span>{editingId ? 'Update Evolution' : 'Commit Asset'}</span>
                   </button>
                   <button 
                    onClick={resetForm}
                    className="flex-1 bg-white/5 text-brand-text/40 py-5 rounded-2xl font-black uppercase tracking-widest text-xs border border-white/10 hover:text-brand-text transition-all"
                   >
                     Cancel Session
                   </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 gap-6">
        {loading ? (
          <div className="text-center py-20 flex justify-center"><div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
        ) : services.length === 0 ? (
          <div className="glass p-20 rounded-[2rem] text-center border border-white/5">
             <Layout className="w-16 h-16 text-brand-text/10 mx-auto mb-6" />
             <p className="text-brand-text/40 font-black uppercase tracking-widest text-xs">No Agency Assets Found in Core System.</p>
          </div>
        ) : (
          services.map(service => {
            const serviceThumbnailSrc = resolveImageSource(service, {
              mediaPaths: ['thumbnailMedia'],
              stringPaths: ['thumbnail'],
              placeholder: '/services-card.png',
            });
            return (
            <div key={service.id} className="glass rounded-3xl p-6 md:p-8 border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-8 hover:border-primary/20 transition-all group bg-white/[0.02]">
               <div className="flex flex-col md:flex-row items-start md:items-center gap-6 flex-1">
                  <div className="relative w-full md:w-40 aspect-video rounded-2xl overflow-hidden border border-white/10 flex-shrink-0">
                    <UploadedImage
                      src={serviceThumbnailSrc}
                      fallbackSrc="/services-card.png"
                      alt={service.title}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                  </div>
                  <div className="space-y-3">
                    <h3 className="font-black text-2xl uppercase text-brand-text group-hover:text-primary transition-colors">{service.title}</h3>
                    <p className="text-brand-text/40 text-xs font-medium line-clamp-2 italic">{service.description}</p>
                    <div className="flex flex-wrap gap-2">
                      {(service.tags || []).map((tag, i) => (
                        <span key={i} className="text-[8px] font-black uppercase tracking-widest bg-white/5 border border-white/10 px-2 py-1 rounded-md text-brand-text/30">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
               </div>
               <div className="flex items-center gap-3">
                  <button 
                    onClick={() => handleEdit(service)}
                    className="p-4 bg-white/5 hover:bg-white/10 rounded-2xl text-primary transition-all border border-white/10"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => handleDelete(service.id)}
                    className="p-4 bg-accent/10 hover:bg-accent/20 rounded-2xl text-accent transition-all border border-accent/20"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
               </div>
            </div>
          )})
        )}
      </div>
    </div>
  );
};

export default ManageAgencyServices;
