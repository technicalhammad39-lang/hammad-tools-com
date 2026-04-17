'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '@/context/AuthContext';
import { Plus, Trash2, Edit, Save, X, FileText, Image as ImageIcon, Upload, Loader2, ArrowLeft } from 'lucide-react';
import { deleteUploadedMedia, toStorageMetadata, uploadMediaFile } from '@/lib/storage-utils';
import { logFirestoreSaveFailure, sanitizeForFirestore } from '@/lib/firestore-sanitize';
import type { StoredFileMetadata } from '@/lib/types/domain';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, orderBy, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase';
import Image from 'next/image';
import { useToast } from '@/components/ToastProvider';

const BlogCMS = () => {
  const { isStaff, profile } = useAuth();
  const toast = useToast();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [editingPost, setEditingPost] = useState<any>(null);

  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    thumbnail: '',
    thumbnailMedia: null as StoredFileMetadata | null,
    category: 'General',
    published: false,
    tags: ''
  });

  useEffect(() => {
    if (!isStaff) return;

    const q = query(collection(db, 'blogPosts'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      console.error('Error fetching posts:', error);
      toast.error('Failed to load posts');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isStaff]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const sanitizedSlug = formData.slug.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

    let rawPayloadForDebug: Record<string, unknown> | null = null;
    let finalPayloadForDebug: Record<string, unknown> | null = null;

    const postData = {
      ...formData,
      slug: sanitizedSlug,
      tags: formData.tags.split(',').map(t => t.trim()),
      author: profile?.displayName || 'Admin',
      authorId: profile?.uid,
      thumbnailMedia: formData.thumbnailMedia || null,
      updatedAt: serverTimestamp(),
    };
    rawPayloadForDebug = postData as Record<string, unknown>;

    try {
      const sanitizedPostData = sanitizeForFirestore(postData);
      finalPayloadForDebug = sanitizedPostData as Record<string, unknown>;

      if (editingPost) {
        await updateDoc(doc(db, 'blogPosts', editingPost.id), sanitizedPostData);
        toast.success('Post updated');
      } else {
        await addDoc(collection(db, 'blogPosts'), sanitizeForFirestore({
          ...sanitizedPostData,
          createdAt: serverTimestamp(),
        }));
        toast.success('Post created');
      }
      setIsAdding(false);
      setEditingPost(null);
      setFormData({
        title: '',
        slug: '',
        excerpt: '',
        content: '',
        thumbnail: '',
        thumbnailMedia: null,
        category: 'General',
        published: false,
        tags: '',
      });
    } catch (error) {
      logFirestoreSaveFailure({
        scope: 'admin-blog-save',
        collection: 'blogPosts',
        payload: finalPayloadForDebug || rawPayloadForDebug,
        sanitized: Boolean(finalPayloadForDebug),
        error,
      });
      console.error('Error saving post:', error);
      toast.error('Failed to save post', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this post?')) {
      try {
        const target = posts.find((entry) => entry.id === id);
        const mediaId = target?.thumbnailMedia?.mediaId || '';
        if (mediaId) {
          await deleteUploadedMedia(mediaId).catch((mediaError) => {
            console.warn('Blog thumbnail cleanup failed:', mediaError);
          });
        }
        await deleteDoc(doc(db, 'blogPosts', id));
        toast.success('Post deleted');
      } catch (error) {
        console.error('Error deleting post:', error);
        toast.error('Failed to delete post', error instanceof Error ? error.message : 'Please try again.');
      }
    }
  };

  if (!isStaff) return <div className="pt-32 text-center">Access Denied.</div>;

  return (
    <div className="pt-32 pb-24 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-center text-center mb-10 gap-6">
          <div className="flex flex-col items-center">
            <h1 className="text-3xl md:text-5xl font-black uppercase text-brand-text leading-tight">
              Blog <span className="text-primary">CMS</span>
            </h1>
            <p className="text-brand-text/40 text-[10px] md:text-sm font-black uppercase tracking-widest mt-2 px-10">Content & News Distribution Hub</p>
          </div>
          <button 
            onClick={() => setIsAdding(true)}
            className="w-full md:w-auto bg-primary text-brand-bg px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[11px] flex items-center justify-center gap-3 border-b-4 border-[#FF8C2A] shadow-xl shadow-primary/10 transition-all active:scale-95"
          >
            <Plus className="w-5 h-5" />
            <span>Add New Post</span>
          </button>
        </div>

        {(isAdding || editingPost) && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="fixed inset-0 md:relative md:inset-auto w-full h-full md:h-auto bg-[#121212] md:bg-transparent z-[60] md:z-auto overflow-y-auto md:overflow-visible rounded-none md:rounded-[2.5rem] p-6 md:p-10 border-none md:border border-white/10 mb-12 backdrop-blur-3xl md:backdrop-blur-none"
          >
            <div className="max-w-4xl mx-auto pt-20 relative">
              <button 
                onClick={() => { setIsAdding(false); setEditingPost(null); }}
                className="absolute top-4 left-0 flex items-center gap-2 text-brand-text/40 hover:text-primary transition-colors py-2 px-4 bg-white/5 rounded-xl border border-white/5"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">Abort Mission</span>
              </button>
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-black uppercase text-brand-text">{editingPost ? 'Edit Intel' : 'New Deployment'}</h2>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-brand-text/40 mb-2">Title</label>
                  <input 
                    type="text" 
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-primary"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-brand-text/40 mb-2">Slug</label>
                  <input 
                    type="text" 
                    value={formData.slug}
                    onChange={(e) => {
                      const strictSlug = e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
                      setFormData({...formData, slug: strictSlug})
                    }}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-primary"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-brand-text/40 mb-2">Excerpt</label>
                  <textarea 
                    value={formData.excerpt}
                    onChange={(e) => setFormData({...formData, excerpt: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-primary h-24"
                    required
                  />
                </div>
                <div className="pt-2">
                  <label className="block text-xs font-bold uppercase tracking-widest text-brand-text/40 mb-3">Feature Image</label>
                  <div className="flex items-center space-x-4">
                    <div className="w-20 h-20 rounded-xl bg-white/5 border border-white/10 flex-shrink-0 relative overflow-hidden">
                      {formData.thumbnail ? (
                        <Image src={formData.thumbnail} alt="Preview" fill className="object-cover" />
                      ) : (
                        <ImageIcon className="w-8 h-8 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-brand-text/10" />
                      )}
                    </div>
                    <div className="flex-1">
                      <label className="inline-flex items-center space-x-2 bg-white/5 hover:bg-white/10 px-4 py-2 rounded-lg border border-white/10 cursor-pointer transition-colors text-xs font-bold uppercase tracking-widest">
                        {uploading ? <Loader2 className="w-4 h-4 animate-spin text-primary" /> : <Upload className="w-4 h-4 text-primary" />}
                        <span>{uploading ? 'Uploading...' : 'Upload Image'}</span>
                        <input 
                          type="file" 
                          className="hidden" 
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            setUploading(true);
                            setUploadProgress(20);
                            try {
                              const media = await uploadMediaFile({
                                file,
                                folder: 'blogs',
                                relatedType: 'blog',
                                relatedId: editingPost?.id || '',
                                replaceMediaId: formData.thumbnailMedia?.mediaId || '',
                              });
                              setFormData((prev) => ({
                                ...prev,
                                thumbnail: media.url,
                                thumbnailMedia: toStorageMetadata(media),
                              }));
                              setUploadProgress(100);
                            } catch (error) {
                              const message =
                                error instanceof Error ? error.message : 'Unable to upload image.';
                              toast.error('Upload failed', message);
                            } finally {
                              setUploading(false);
                              setUploadProgress(0);
                            }
                          }}
                        />
                      </label>
                      {uploading && (
                        <div className="mt-2 h-1 bg-white/5 rounded-full overflow-hidden w-32">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${uploadProgress}%` }} className="h-full bg-primary" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-brand-text/40 mb-2">Content (Markdown)</label>
                  <textarea 
                    value={formData.content}
                    onChange={(e) => setFormData({...formData, content: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-primary h-64 font-mono text-sm"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-brand-text/40 mb-2">Category</label>
                    <input 
                      type="text" 
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-brand-text/40 mb-2">Tags (comma separated)</label>
                    <input 
                      type="text" 
                      value={formData.tags}
                      onChange={(e) => setFormData({...formData, tags: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <input 
                    type="checkbox" 
                    checked={formData.published}
                    onChange={(e) => setFormData({...formData, published: e.target.checked})}
                    className="w-5 h-5 rounded border-white/10 bg-white/5 text-primary"
                  />
                  <span className="font-bold">Publish Article</span>
                </div>
              </div>

              <div className="md:col-span-2 flex flex-col md:flex-row justify-end gap-4 p-6 border-t border-white/5 bg-black/40 -mx-6 -mb-6 md:mx-0 md:mb-0 md:rounded-b-[2.5rem] mt-8">
                <button type="button" onClick={() => { setIsAdding(false); setEditingPost(null); }} className="order-2 md:order-1 px-6 py-4 rounded-2xl font-black uppercase tracking-widest text-[11px] text-brand-text/40 hover:text-brand-text transition-colors">Abort Session</button>
                <button type="submit" className="order-1 md:order-2 bg-primary text-brand-bg px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-[11px] border-b-4 border-[#FF8C2A] shadow-xl shadow-primary/10 active:border-b-0 transition-all flex items-center justify-center gap-2">
                  <Save className="w-4 h-4" />
                  <span>{editingPost ? 'Push Update' : 'Authorize Deployment'}</span>
                </button>
              </div>
            </form>
            </div>
          </motion.div>
        )}

        <div className="glass rounded-[2.5rem] border-white/10 overflow-hidden">
          <div className="p-10">
            {loading ? (
              <div className="text-center py-10">Loading posts...</div>
            ) : posts.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="pb-6 text-xs font-bold uppercase tracking-widest text-brand-text/40">Article</th>
                      <th className="pb-6 text-xs font-bold uppercase tracking-widest text-brand-text/40">Category</th>
                      <th className="pb-6 text-xs font-bold uppercase tracking-widest text-brand-text/40">Status</th>
                      <th className="pb-6 text-xs font-bold uppercase tracking-widest text-brand-text/40 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {posts.map((post) => (
                      <tr key={post.id} className="border-b border-white/5 group">
                        <td className="py-6">
                          <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 rounded-xl overflow-hidden bg-white/5 relative">
                              <Image 
                                src={post.thumbnail || 'https://picsum.photos/seed/blog/100/100'} 
                                className="object-cover" 
                                alt="" 
                                fill
                                referrerPolicy="no-referrer"
                              />
                            </div>
                            <div>
                              <h4 className="font-bold group-hover:text-primary transition-colors">{post.title}</h4>
                              <p className="text-xs text-brand-text/40">/{post.slug}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-6">
                          <span className="text-sm">{post.category}</span>
                        </td>
                        <td className="py-6">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            post.published ? 'bg-emerald-500/10 text-emerald-500' : 'bg-brand-text/10 text-brand-text/40'
                          }`}>
                            {post.published ? 'Published' : 'Draft'}
                          </span>
                        </td>
                        <td className="py-6 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <button 
                              onClick={() => {
                                setEditingPost(post);
                                setFormData({
                                  title: post.title,
                                  slug: post.slug,
                                  excerpt: post.excerpt,
                                  content: post.content,
                                  thumbnail: post.thumbnail || '',
                                  thumbnailMedia: post.thumbnailMedia || null,
                                  category: post.category,
                                  published: post.published,
                                  tags: post.tags?.join(', ') || ''
                                });
                              }}
                              className="p-2 hover:bg-white/10 rounded-full text-brand-text/40 hover:text-primary transition-colors"
                            >
                              <Edit className="w-5 h-5" />
                            </button>
                            <button 
                              onClick={() => handleDelete(post.id)}
                              className="p-2 hover:bg-white/10 rounded-full text-brand-text/40 hover:text-accent transition-colors"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-20">
                <FileText className="w-16 h-16 text-brand-text/10 mx-auto mb-4" />
                <p className="text-brand-text/40">No blog posts found. Create your first one!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlogCMS;
