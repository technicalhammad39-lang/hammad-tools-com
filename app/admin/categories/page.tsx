'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/firebase';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { Loader2, Plus, Edit2, Trash2, Save, X, Image as ImageIcon } from 'lucide-react';
import { useEffect } from 'react';
import type { Category, CategoryType } from '@/lib/types/domain';
import { deleteUploadedMedia, toStorageMetadataFromLibrary } from '@/lib/storage-utils';
import { logFirestoreSaveFailure, sanitizeForFirestore } from '@/lib/firestore-sanitize';
import { useToast } from '@/components/ToastProvider';
import { resolveImageSource } from '@/lib/image-display';
import UploadedImage from '@/components/UploadedImage';
import MediaLibraryModal from '@/components/MediaLibraryModal';

const CATEGORY_TYPES: Array<{ value: CategoryType; label: string }> = [
  { value: 'tools', label: 'Tools' },
  { value: 'services', label: 'Services' },
  { value: 'both', label: 'Both' },
];

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export default function AdminCategoriesPage() {
  const { isStaff } = useAuth();
  const toast = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isMediaLibraryOpen, setIsMediaLibraryOpen] = useState(false);
  const [form, setForm] = useState<Partial<Category>>({
    name: '',
    slug: '',
    type: 'tools',
    iconUrl: '',
    imageUrl: '',
    imageMedia: null,
    active: true,
    sortOrder: 0,
  });

  useEffect(() => {
    if (!isStaff) {
      return;
    }

    const q = query(collection(db, 'categories'), orderBy('sortOrder', 'asc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs.map((snap) => ({ id: snap.id, ...(snap.data() as Omit<Category, 'id'>) }));
        setCategories(docs);
        setLoading(false);
      },
      (error) => {
        console.error('Failed to load categories:', error);
        toast.error('Failed to load categories');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [isStaff]);

  const modeLabel = useMemo(() => (editingId ? 'Edit Category' : 'Create Category'), [editingId]);
  const formImageSrc = resolveImageSource(form, {
    mediaPaths: ['imageMedia'],
    stringPaths: ['imageUrl'],
  });

  if (!isStaff) {
    return <div className="p-10 text-center font-black uppercase tracking-widest">Access Denied</div>;
  }

  async function handleSave() {
    if (!form.name?.trim()) {
      toast.error('Category name required');
      return;
    }

    setSaving(true);
    let rawPayloadForDebug: Record<string, unknown> | null = null;
    let finalPayloadForDebug: Record<string, unknown> | null = null;
    try {
      const payload = {
        name: form.name.trim(),
        slug: (form.slug?.trim() || slugify(form.name)).slice(0, 120),
        type: (form.type || 'tools') as CategoryType,
        iconUrl: form.iconUrl?.trim() || '',
        imageUrl: form.imageUrl?.trim() || '',
        imageMedia: form.imageMedia || null,
        active: Boolean(form.active),
        sortOrder: Number(form.sortOrder || 0),
        updatedAt: serverTimestamp(),
      };
      rawPayloadForDebug = payload as Record<string, unknown>;
      const sanitizedPayload = sanitizeForFirestore(payload);
      finalPayloadForDebug = sanitizedPayload as Record<string, unknown>;

      if (editingId) {
        await updateDoc(doc(db, 'categories', editingId), sanitizedPayload);
        toast.success('Category updated');
      } else {
        await addDoc(collection(db, 'categories'), sanitizeForFirestore({
          ...sanitizedPayload,
          createdAt: serverTimestamp(),
        }));
        toast.success('Category created');
      }

      setIsFormOpen(false);
      setEditingId(null);
      setForm({
        name: '',
        slug: '',
        type: 'tools',
        iconUrl: '',
        imageUrl: '',
        imageMedia: null,
        active: true,
        sortOrder: 0,
      });
    } catch (error) {
      logFirestoreSaveFailure({
        scope: 'admin-categories-save',
        collection: 'categories',
        payload: finalPayloadForDebug || rawPayloadForDebug,
        sanitized: Boolean(finalPayloadForDebug),
        error,
      });
      console.error('Failed to save category:', error);
      toast.error('Failed to save category', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this category?')) {
      return;
    }
    try {
      const target = categories.find((entry) => entry.id === id);
      const mediaId = target?.imageMedia?.mediaId || '';
      if (mediaId) {
        await deleteUploadedMedia(mediaId).catch((mediaError) => {
          console.warn('Category image cleanup failed:', mediaError);
        });
      }
      await deleteDoc(doc(db, 'categories', id));
      toast.success('Category deleted');
    } catch (error) {
      console.error('Failed to delete category:', error);
      toast.error('Failed to delete category', error instanceof Error ? error.message : 'Please try again.');
    }
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black uppercase text-brand-text">Category <span className="text-primary">Control</span></h1>
          <p className="text-brand-text/40 text-[10px] font-black uppercase tracking-[0.3em] mt-2">Dynamic Filters For Tools & Services</p>
        </div>
        <button
          onClick={() => {
            setEditingId(null);
            setForm({
              name: '',
              slug: '',
              type: 'tools',
              iconUrl: '',
              imageUrl: '',
              imageMedia: null,
              active: true,
              sortOrder: categories.length,
            });
            setIsFormOpen(true);
          }}
          className="bg-primary text-black px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] border-b-4 border-secondary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add Category
        </button>
      </div>

      <AnimatePresence>
        {isFormOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="glass rounded-[2rem] border border-white/5 overflow-hidden"
          >
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black uppercase text-brand-text">{modeLabel}</h2>
                <p className="text-[9px] text-brand-text/30 font-black uppercase tracking-widest">Name, slug, type and ordering</p>
              </div>
              <button onClick={() => setIsFormOpen(false)} className="p-2 rounded-lg bg-white/5 text-brand-text/40 hover:text-accent">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                value={form.name || ''}
                onChange={(event) => {
                  const name = event.target.value;
                  setForm((prev) => ({ ...prev, name, slug: slugify(name) }));
                }}
                placeholder="Category name"
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary"
              />

              <input
                type="text"
                value={form.slug || ''}
                onChange={(event) => setForm((prev) => ({ ...prev, slug: slugify(event.target.value) }))}
                placeholder="category-slug"
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary"
              />

              <select
                value={form.type || 'tools'}
                onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value as CategoryType }))}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary"
              >
                {CATEGORY_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>

              <input
                type="number"
                value={Number(form.sortOrder || 0)}
                onChange={(event) => setForm((prev) => ({ ...prev, sortOrder: Number(event.target.value) }))}
                placeholder="Sort order"
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary"
              />

              <input
                type="text"
                value={form.iconUrl || ''}
                onChange={(event) => setForm((prev) => ({ ...prev, iconUrl: event.target.value }))}
                placeholder="Icon URL (optional)"
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary"
              />

              <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                <span className="text-xs font-black uppercase tracking-widest text-brand-text/40">Active</span>
                <input
                  type="checkbox"
                  checked={Boolean(form.active)}
                  onChange={(event) => setForm((prev) => ({ ...prev, active: event.target.checked }))}
                  className="w-4 h-4"
                />
              </div>

              <div className="md:col-span-2">
                <div className="flex items-center gap-4">
                  <div className="relative w-24 h-24 rounded-xl border border-white/10 bg-white/5 overflow-hidden">
                    {formImageSrc ? (
                      <UploadedImage
                        src={formImageSrc}
                        fallbackSrc="/services-card.png"
                        alt="Category"
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full grid place-items-center text-[9px] uppercase text-brand-text/20 font-black tracking-widest">No image</div>
                    )}
                  </div>
                  <div className="space-y-3 flex-1">
                    <input
                      type="text"
                      value={form.imageUrl || ''}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, imageUrl: event.target.value, imageMedia: null }))
                      }
                      placeholder="Image URL (optional)"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary"
                    />
                    <button
                      type="button"
                      onClick={() => setIsMediaLibraryOpen(true)}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest hover:bg-white/10"
                    >
                      <ImageIcon className="w-4 h-4 text-primary" />
                      Open Media Library
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-white/5 flex justify-end gap-3">
              <button onClick={() => setIsFormOpen(false)} className="px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest text-brand-text/40 hover:text-brand-text">
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-8 py-3 rounded-xl bg-primary text-black border-b-4 border-secondary text-xs font-black uppercase tracking-widest flex items-center gap-2 disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Category
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div className="py-20 flex justify-center"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
        ) : categories.length === 0 ? (
          <div className="glass rounded-2xl border border-white/5 p-10 text-center text-brand-text/30 text-xs uppercase tracking-widest font-black">
            No categories found.
          </div>
        ) : (
          categories.map((category) => {
            const categoryImageSrc = resolveImageSource(category, {
              mediaPaths: ['imageMedia'],
              stringPaths: ['imageUrl'],
            });
            return (
            <div key={category.id} className="glass rounded-2xl border border-white/5 p-6 flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                <div className="relative w-14 h-14 rounded-xl border border-white/10 bg-white/5 overflow-hidden">
                  {categoryImageSrc ? (
                    <UploadedImage
                      src={categoryImageSrc}
                      fallbackSrc="/services-card.png"
                      alt={category.name}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full grid place-items-center text-[8px] text-brand-text/20 uppercase font-black">CAT</div>
                  )}
                </div>
                <div>
                  <div className="text-lg font-black uppercase text-brand-text">{category.name}</div>
                  <div className="text-[9px] text-brand-text/30 font-black uppercase tracking-widest">{category.slug} · {category.type}</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className={`text-[9px] px-3 py-1.5 rounded-full border font-black uppercase tracking-widest ${category.active ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-accent/10 text-accent border-accent/20'}`}>
                  {category.active ? 'Active' : 'Inactive'}
                </span>
                <button
                  onClick={() => {
                    setEditingId(category.id);
                    setForm({
                      ...category,
                      imageUrl: resolveImageSource(category, {
                        mediaPaths: ['imageMedia'],
                        stringPaths: ['imageUrl'],
                      }),
                    });
                    setIsFormOpen(true);
                  }}
                  className="p-3 rounded-xl bg-white/5 border border-white/10 text-primary hover:bg-white/10"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(category.id)}
                  className="p-3 rounded-xl bg-accent/10 border border-accent/20 text-accent hover:bg-accent/20"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          )})
        )}
      </div>

      <MediaLibraryModal
        open={isMediaLibraryOpen}
        onClose={() => setIsMediaLibraryOpen(false)}
        onSelect={(media) => {
          setForm((prev) => ({
            ...prev,
            imageUrl: media.url,
            imageMedia: toStorageMetadataFromLibrary(media),
          }));
        }}
        folder="services"
        title="Category Media Library"
        description="Select an existing category image or upload a new one from this library."
        accept="image/*"
        relatedType="category"
        relatedId={editingId || ''}
        replaceMediaId={form.imageMedia?.mediaId || ''}
      />
    </div>
  );
}

