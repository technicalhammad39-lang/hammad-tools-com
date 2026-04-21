'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/firebase';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import {
  Plus,
  Edit2,
  Trash2,
  Loader2,
  Image as ImageIcon,
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';
import { deleteUploadedMedia, toStorageMetadataFromLibrary } from '@/lib/storage-utils';
import { logFirestoreSaveFailure, sanitizeForFirestore } from '@/lib/firestore-sanitize';
import type { Category, ProductItem, ProductPlan, StoredFileMetadata } from '@/lib/types/domain';
import { useToast } from '@/components/ToastProvider';
import { resolveImageSource } from '@/lib/image-display';
import UploadedImage from '@/components/UploadedImage';
import MediaLibraryModal from '@/components/MediaLibraryModal';

type DurationUnit = 'fixed_days' | 'fixed_months' | 'fixed_years';
type DurationPreset = '1_month' | '2_months' | '3_months' | '6_months' | '12_months' | 'lifetime' | 'custom';

interface ProductForm {
  title: string;
  description: string;
  price: string;
  salePrice: string;
  categoryId: string;
  categoryName: string;
  customCategoryName: string;
  image: string;
  imageMedia: StoredFileMetadata | null;
  durationPreset: DurationPreset;
  customDurationValue: string;
  customDurationUnit: DurationUnit;
  warranty: string;
  planType: string;
  plans: ProductPlan[];
}

const defaultForm: ProductForm = {
  title: '',
  description: '',
  price: '',
  salePrice: '',
  categoryId: '',
  categoryName: '',
  customCategoryName: '',
  image: '',
  imageMedia: null,
  durationPreset: '1_month',
  customDurationValue: '',
  customDurationUnit: 'fixed_months',
  warranty: '',
  planType: '',
  plans: [],
};

const CUSTOM_CATEGORY_VALUE = '__custom__';

const durationPresetOptions: Array<{ value: DurationPreset; label: string }> = [
  { value: '1_month', label: '1 month' },
  { value: '2_months', label: '2 months' },
  { value: '3_months', label: '3 months' },
  { value: '6_months', label: '6 months' },
  { value: '12_months', label: '12 months' },
  { value: 'lifetime', label: 'Lifetime' },
  { value: 'custom', label: 'Custom' },
];

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function parseNumberInput(value: string, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function createEditorPlanId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `plan_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function normalizePlanForEditor(plan: ProductPlan): ProductPlan {
  return {
    ...plan,
    id: plan.id || createEditorPlanId(),
    benefits: normalizeBenefitsForEditor(plan.benefits),
  };
}

function normalizeBenefitsForEditor(benefits: unknown) {
  const values = Array.isArray(benefits)
    ? benefits.map((benefit) => String(benefit ?? '')).filter((benefit) => benefit.length > 0)
    : typeof benefits === 'string'
      ? benefits.split(',').map((benefit) => benefit.trim()).filter(Boolean)
      : [];
  if (!values.length || values[values.length - 1].trim() !== '') {
    values.push('');
  }
  return values;
}

function normalizeBenefitsForSave(benefits: unknown) {
  if (Array.isArray(benefits)) {
    return benefits.map((benefit) => String(benefit ?? '').trim()).filter(Boolean);
  }
  if (typeof benefits === 'string') {
    return benefits.split(',').map((benefit) => benefit.trim()).filter(Boolean);
  }
  return [];
}

function getDurationPresetFromItem(item: ProductItem): Pick<ProductForm, 'durationPreset' | 'customDurationUnit' | 'customDurationValue'> {
  const durationType = item.durationType;
  const durationValue = Number(item.durationValue || 0);

  if (durationType === 'lifetime') {
    return {
      durationPreset: 'lifetime',
      customDurationUnit: 'fixed_months',
      customDurationValue: '',
    };
  }

  if (durationType === 'fixed_months') {
    const presetMatch = {
      1: '1_month',
      2: '2_months',
      3: '3_months',
      6: '6_months',
      12: '12_months',
    }[durationValue] as DurationPreset | undefined;

    if (presetMatch) {
      return {
        durationPreset: presetMatch,
        customDurationUnit: 'fixed_months',
        customDurationValue: '',
      };
    }
  }

  const customUnit: DurationUnit = durationType === 'fixed_days' || durationType === 'fixed_months' || durationType === 'fixed_years'
    ? durationType
    : 'fixed_months';

  return {
    durationPreset: 'custom',
    customDurationUnit: customUnit,
    customDurationValue: String(durationValue > 0 ? durationValue : 1),
  };
}

function buildDurationPayload(form: ProductForm) {
  if (form.durationPreset === 'lifetime') {
    return {
      durationType: 'lifetime' as const,
      durationValue: null,
      durationLabel: 'Lifetime',
    };
  }

  const monthPresetMap: Record<Exclude<DurationPreset, 'lifetime' | 'custom'>, number> = {
    '1_month': 1,
    '2_months': 2,
    '3_months': 3,
    '6_months': 6,
    '12_months': 12,
  };

  if (form.durationPreset !== 'custom') {
    const months = monthPresetMap[form.durationPreset];
    return {
      durationType: 'fixed_months' as const,
      durationValue: months,
      durationLabel: `${months} ${months === 1 ? 'Month' : 'Months'}`,
    };
  }

  const customValue = Math.max(1, parseNumberInput(form.customDurationValue, 1));
  const unitLabel = form.customDurationUnit === 'fixed_days'
    ? customValue === 1 ? 'Day' : 'Days'
    : form.customDurationUnit === 'fixed_years'
      ? customValue === 1 ? 'Year' : 'Years'
      : customValue === 1 ? 'Month' : 'Months';

  return {
    durationType: form.customDurationUnit,
    durationValue: customValue,
    durationLabel: `${customValue} ${unitLabel}`,
  };
}

function mapDocToForm(item: ProductItem): ProductForm {
  const durationPresetValues = getDurationPresetFromItem(item);

  return {
    title: item.title || item.name || '',
    description: item.description || item.longDescription || '',
    price: String(item.price ?? ''),
    salePrice: item.salePrice != null ? String(item.salePrice) : '',
    categoryId: item.categoryId || '',
    categoryName: item.categoryName || item.category || '',
    customCategoryName: '',
    image: resolveImageSource(item, {
      mediaPaths: ['imageMedia'],
      stringPaths: ['image', 'thumbnail'],
    }),
    imageMedia: item.imageMedia || null,
    warranty: item.warranty || '',
    planType: item.planType || '',
    plans: Array.isArray(item.plans)
      ? item.plans.map((plan) => normalizePlanForEditor(plan))
      : [],
    ...durationPresetValues,
  };
}

const AdminProductsPage = () => {
  const { isStaff } = useAuth();
  const toast = useToast();
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isMediaLibraryOpen, setIsMediaLibraryOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductForm>(defaultForm);

  useEffect(() => {
    if (!isStaff) {
      return;
    }

    const unsubscribeProducts = onSnapshot(
      query(collection(db, 'services'), orderBy('sortOrder', 'asc')),
      (snapshot) => {
        const data = snapshot.docs
          .map((doc) => ({ id: doc.id, ...(doc.data() as Omit<ProductItem, 'id'>) }))
          .filter((item) => (item.type || 'tools') === 'tools');
        setProducts(data);
        setLoading(false);
      },
      (error) => {
        console.error('Failed to load tools:', error);
        toast.error('Failed to load tools');
        setLoading(false);
      }
    );

    const unsubscribeCategories = onSnapshot(
      query(collection(db, 'categories'), orderBy('sortOrder', 'asc')),
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Omit<Category, 'id'>) }));
        setCategories(data);
      }
    );

    return () => {
      unsubscribeProducts();
      unsubscribeCategories();
    };
  }, [isStaff, toast]);

  const visibleCategories = useMemo(
    () => categories.filter((category) => category.active !== false && (category.type === 'tools' || category.type === 'both')),
    [categories]
  );

  const formModeLabel = editingId ? 'Edit Tool' : 'Add Tool';
  const formImageSrc = resolveImageSource(form, {
    mediaPaths: ['imageMedia'],
    stringPaths: ['image'],
  });

  if (!isStaff) {
    return (
      <div className="pt-32 pb-24 text-center">
        <h1 className="text-3xl font-bold">Access Denied</h1>
        <Link href="/" className="text-primary mt-4 block">Return Home</Link>
      </div>
    );
  }

  function openAddForm() {
    setEditingId(null);
    setForm(defaultForm);
    setIsAdding(true);
  }

  function openEditForm(item: ProductItem) {
    setEditingId(item.id);
    setForm(mapDocToForm(item));
    setIsAdding(true);
  }

  function closeForm() {
    setIsAdding(false);
    setEditingId(null);
    setForm(defaultForm);
  }

  async function handleSave() {
    if (!form.title.trim() || !form.description.trim()) {
      toast.error('Missing required fields', 'Title and description are required.');
      return;
    }

    if (form.durationPreset === 'custom' && !form.customDurationValue.trim()) {
      toast.error('Missing duration value', 'Enter a custom duration value.');
      return;
    }

    let rawPayloadForDebug: Record<string, unknown> | null = null;
    let finalPayloadForDebug: Record<string, unknown> | null = null;

    try {
      let selectedCategoryId = form.categoryId;
      let selectedCategoryName = form.categoryName || '';

      if (form.categoryId === CUSTOM_CATEGORY_VALUE) {
        const customName = form.customCategoryName.trim();
        if (!customName) {
          toast.error('Missing category', 'Enter a custom category name.');
          return;
        }

        const existingCategory = categories.find(
          (category) => (category.name || '').trim().toLowerCase() === customName.toLowerCase()
        );

        if (existingCategory) {
          selectedCategoryId = existingCategory.id;
          selectedCategoryName = existingCategory.name;
        } else {
          const newCategoryPayload = sanitizeForFirestore({
            name: customName,
            slug: slugify(customName),
            type: 'tools',
            active: true,
            sortOrder: categories.length,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          const newCategoryRef = await addDoc(collection(db, 'categories'), newCategoryPayload);
          selectedCategoryId = newCategoryRef.id;
          selectedCategoryName = customName;
        }
      } else {
        const selectedCategory = categories.find((category) => category.id === form.categoryId);
        selectedCategoryName = selectedCategory?.name || form.categoryName || '';
      }

      const durationPayload = buildDurationPayload(form);
      const cleanTitle = form.title.trim();
      const existingItem = editingId ? products.find((item) => item.id === editingId) : null;
      const computedSortOrder = Number(
        existingItem?.sortOrder ??
        existingItem?.orderIndex ??
        products.length
      );

      const payload = {
        title: cleanTitle,
        name: cleanTitle,
        slug: slugify(cleanTitle),
        description: form.description.trim(),
        longDescription: form.description.trim(),
        price: parseNumberInput(form.price, 0),
        salePrice: form.salePrice.trim() ? parseNumberInput(form.salePrice, 0) : null,
        type: 'tools',
        categoryId: selectedCategoryId || '',
        categoryName: selectedCategoryName || '',
        category: selectedCategoryName || '',
        image: form.image,
        thumbnail: form.image,
        imageMedia: form.imageMedia || null,
        featured: false,
        active: true,
        sortOrder: computedSortOrder,
        orderIndex: computedSortOrder,
        durationType: durationPayload.durationType,
        durationValue: durationPayload.durationValue,
        duration: durationPayload.durationLabel,
        customExpiryAt: null,
        activationBehavior: 'activate_on_approval',
        accessType: 'subscription',
        renewable: false,
        deliveryStatus: 'Instant',
        accessLabel: durationPayload.durationLabel,
        warranty: form.warranty.trim(),
        planType: form.planType.trim(),
        plans: form.plans.map((plan) => ({
          ...plan,
          benefits: normalizeBenefitsForSave(plan.benefits),
        })),
        updatedAt: serverTimestamp(),
      };
      rawPayloadForDebug = payload as Record<string, unknown>;
      const sanitizedPayload = sanitizeForFirestore(payload);
      finalPayloadForDebug = sanitizedPayload as Record<string, unknown>;

      if (editingId) {
        await updateDoc(doc(db, 'services', editingId), sanitizedPayload);
        toast.success('Tool updated');
      } else {
        await addDoc(collection(db, 'services'), sanitizeForFirestore({
          ...sanitizedPayload,
          createdAt: serverTimestamp(),
        }));
        toast.success('Tool created');
      }
      closeForm();
    } catch (error) {
      logFirestoreSaveFailure({
        scope: 'admin-tools-save',
        collection: 'services',
        payload: finalPayloadForDebug || rawPayloadForDebug,
        sanitized: Boolean(finalPayloadForDebug),
        error,
      });
      console.error('Failed to save tool:', error);
      toast.error('Failed to save tool', error instanceof Error ? error.message : 'Please try again.');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this tool?')) {
      return;
    }

    try {
      const target = products.find((item) => item.id === id);
      const mediaId = (target as any)?.imageMedia?.mediaId || '';
      if (mediaId) {
        await deleteUploadedMedia(mediaId).catch((mediaError) => {
          console.warn('Tool image cleanup failed:', mediaError);
        });
      }
      await deleteDoc(doc(db, 'services', id));
      toast.success('Tool deleted');
    } catch (error) {
      console.error('Failed to delete tool:', error);
      toast.error('Failed to delete tool', error instanceof Error ? error.message : 'Please try again.');
    }
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl md:text-5xl font-black uppercase text-brand-text leading-tight">
            Manage <span className="text-primary">Tools</span>
          </h1>
          <p className="text-brand-text/40 text-[10px] md:text-sm font-black uppercase tracking-widest mt-2">Premium Tools Control Panel</p>
        </div>
        <button
          onClick={openAddForm}
          className="w-full md:w-auto bg-primary text-brand-bg px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[11px] flex items-center justify-center gap-3 border-b-4 border-[#FF8C2A] shadow-xl shadow-primary/10 transition-all active:scale-95"
        >
          <Plus className="w-5 h-5" />
          <span>Add New Tool</span>
        </button>
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 md:relative md:inset-auto w-full h-full md:h-auto bg-[#121212] md:bg-transparent z-[60] md:z-auto overflow-y-auto md:overflow-visible rounded-none md:rounded-3xl p-6 md:p-8 border-none md:border border-primary/20 backdrop-blur-3xl md:backdrop-blur-none"
          >
            <div className="max-w-5xl mx-auto pt-20 relative">
              <button
                onClick={closeForm}
                className="absolute top-4 left-0 flex items-center gap-2 text-brand-text/40 hover:text-primary transition-colors py-2 px-4 bg-white/5 rounded-xl border border-white/5"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">Back to List</span>
              </button>
              <h2 className="text-3xl font-black uppercase text-brand-text mb-8">{formModeLabel}</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="space-y-2">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-brand-text/50">Tool title *</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                    placeholder="e.g. Canva Pro Shared"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-brand-text/50">Category</label>
                  <select
                    value={form.categoryId}
                    onChange={(event) => {
                      const nextValue = event.target.value;
                      const category = categories.find((item) => item.id === nextValue);
                      setForm((prev) => ({
                        ...prev,
                        categoryId: nextValue,
                        categoryName: category?.name || '',
                      }));
                    }}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3"
                  >
                    <option value="">Select category</option>
                    {visibleCategories.map((category) => (
                      <option key={category.id} value={category.id}>{category.name}</option>
                    ))}
                    <option value={CUSTOM_CATEGORY_VALUE}>Custom</option>
                  </select>
                  {form.categoryId === CUSTOM_CATEGORY_VALUE ? (
                    <input
                      type="text"
                      value={form.customCategoryName}
                      onChange={(event) => setForm((prev) => ({ ...prev, customCategoryName: event.target.value }))}
                      placeholder="Enter new category name"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3"
                    />
                  ) : null}
                  <p className="text-[11px] text-brand-text/50">
                    You can also manage categories in <Link href="/admin/categories" className="text-primary underline">Categories</Link>.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-brand-text/50">Price (PKR)</label>
                  <input
                    type="number"
                    min="0"
                    value={form.price}
                    onChange={(event) => setForm((prev) => ({ ...prev, price: event.target.value }))}
                    placeholder="e.g. 1500"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-brand-text/50">Original price (optional)</label>
                  <input
                    type="number"
                    min="0"
                    value={form.salePrice}
                    onChange={(event) => setForm((prev) => ({ ...prev, salePrice: event.target.value }))}
                    placeholder="e.g. 2200"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-brand-text/50">Duration</label>
                  <select
                    value={form.durationPreset}
                    onChange={(event) => setForm((prev) => ({ ...prev, durationPreset: event.target.value as DurationPreset }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3"
                  >
                    {durationPresetOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>

                {form.durationPreset === 'custom' ? (
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-brand-text/50">Custom duration</label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        min="1"
                        value={form.customDurationValue}
                        onChange={(event) => setForm((prev) => ({ ...prev, customDurationValue: event.target.value }))}
                        placeholder="Value"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3"
                      />
                      <select
                        value={form.customDurationUnit}
                        onChange={(event) => setForm((prev) => ({ ...prev, customDurationUnit: event.target.value as DurationUnit }))}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3"
                      >
                        <option value="fixed_days">Days</option>
                        <option value="fixed_months">Months</option>
                        <option value="fixed_years">Years</option>
                      </select>
                    </div>
                  </div>
                ) : null}

                <div className="space-y-2">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-brand-text/50">Warranty</label>
                  <input
                    type="text"
                    value={form.warranty}
                    onChange={(event) => setForm((prev) => ({ ...prev, warranty: event.target.value }))}
                    placeholder="e.g. Full / Replacement"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-brand-text/50">Plan type</label>
                  <input
                    type="text"
                    value={form.planType}
                    onChange={(event) => setForm((prev) => ({ ...prev, planType: event.target.value }))}
                    placeholder="e.g. Individual / Shared"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3"
                  />
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-xs font-bold uppercase tracking-widest text-brand-text/40 mb-3 text-left">Tool Image</label>
                <div className="flex items-center space-x-6">
                  <div className="w-32 h-32 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center relative overflow-hidden group">
                    {formImageSrc ? (
                      <UploadedImage
                        src={formImageSrc}
                        fallbackSrc="/services-card.png"
                        alt="Preview"
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="w-10 h-10 text-brand-text/10" />
                    )}
                  </div>
                  <div className="flex-1">
                    <input
                      type="text"
                      value={form.image}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, image: event.target.value, imageMedia: null }))
                      }
                      placeholder="Image URL"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 mb-3"
                    />
                    <button
                      type="button"
                      onClick={() => setIsMediaLibraryOpen(true)}
                      className="inline-flex items-center space-x-2 bg-white/5 hover:bg-white/10 px-4 py-2.5 rounded-xl border border-white/10 transition-colors"
                    >
                      <ImageIcon className="w-4 h-4 text-primary" />
                      <span className="text-xs font-bold uppercase tracking-widest">Open Media Library</span>
                    </button>
                    <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-brand-text/35">
                      Reuse existing images or upload from device inside library.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <label className="block text-[10px] font-black uppercase tracking-widest text-brand-text/50">Description *</label>
                <textarea
                  value={form.description}
                  onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                  placeholder="Describe this tool clearly"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 h-32"
                />
              </div>

              <div className="mb-8 p-6 glass border border-white/5 rounded-2xl">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-black uppercase tracking-widest text-brand-text">Plans / Packages</h3>
                  <button
                    onClick={() => {
                      const basePrice = parseNumberInput(form.price, 0);
                      setForm((prev) => ({
                        ...prev,
                        plans: [
                          ...prev.plans,
                          {
                            id: createEditorPlanId(),
                            planName: 'Standard',
                            ourPrice: basePrice,
                            officialPrice: basePrice ? basePrice * 1.5 : 0,
                            benefits: [''],
                          },
                        ],
                      }));
                    }}
                    className="text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-400 px-4 py-2 rounded-lg border border-emerald-500/20"
                  >
                    Add Plan
                  </button>
                </div>

                <div className="space-y-4">
                  {form.plans.map((plan, planIndex) => (
                    <div key={plan.id || `plan-${planIndex}`} className="bg-black/30 border border-white/10 rounded-xl p-4 space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div className="space-y-1">
                          <label className="text-[9px] font-black uppercase tracking-widest text-brand-text/40">Plan name</label>
                          <input
                            type="text"
                            value={plan.planName}
                            onChange={(event) => {
                              const nextPlans = [...form.plans];
                              nextPlans[planIndex] = { ...nextPlans[planIndex], planName: event.target.value };
                              setForm((prev) => ({ ...prev, plans: nextPlans }));
                            }}
                            placeholder="e.g. Standard"
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-black uppercase tracking-widest text-brand-text/40">Current price</label>
                          <input
                            type="number"
                            value={plan.ourPrice}
                            onChange={(event) => {
                              const nextPlans = [...form.plans];
                              nextPlans[planIndex] = { ...nextPlans[planIndex], ourPrice: Number(event.target.value) };
                              setForm((prev) => ({ ...prev, plans: nextPlans }));
                            }}
                            placeholder="Price"
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-black uppercase tracking-widest text-brand-text/40">Original price</label>
                          <input
                            type="number"
                            value={plan.officialPrice || 0}
                            onChange={(event) => {
                              const nextPlans = [...form.plans];
                              nextPlans[planIndex] = { ...nextPlans[planIndex], officialPrice: Number(event.target.value) };
                              setForm((prev) => ({ ...prev, plans: nextPlans }));
                            }}
                            placeholder="Original"
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-black uppercase tracking-widest text-brand-text/40">Action</label>
                          <button
                            onClick={() => {
                              setForm((prev) => ({ ...prev, plans: prev.plans.filter((_, idx) => idx !== planIndex) }));
                            }}
                            className="w-full h-[38px] bg-accent/10 border border-accent/20 rounded-xl text-accent text-xs font-black uppercase tracking-widest"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase tracking-widest text-brand-text/40">Benefits</label>
                        <div className="space-y-2">
                          {normalizeBenefitsForEditor(plan.benefits).map((benefit, benefitIndex) => {
                            const values = normalizeBenefitsForEditor(plan.benefits);
                            const isLast = benefitIndex === values.length - 1;
                            return (
                              <div key={`benefit-${planIndex}-${benefitIndex}`} className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={benefit}
                                  onChange={(event) => {
                                    const nextPlans = [...form.plans];
                                    const nextBenefits = normalizeBenefitsForEditor(nextPlans[planIndex].benefits);
                                    nextBenefits[benefitIndex] = event.target.value;
                                    if (nextBenefits[nextBenefits.length - 1].trim() !== '') {
                                      nextBenefits.push('');
                                    }
                                    while (
                                      nextBenefits.length > 1 &&
                                      nextBenefits[nextBenefits.length - 1].trim() === '' &&
                                      nextBenefits[nextBenefits.length - 2].trim() === ''
                                    ) {
                                      nextBenefits.pop();
                                    }
                                    nextPlans[planIndex] = {
                                      ...nextPlans[planIndex],
                                      benefits: nextBenefits,
                                    };
                                    setForm((prev) => ({ ...prev, plans: nextPlans }));
                                  }}
                                  placeholder={isLast ? 'Add next benefit' : 'Benefit'}
                                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm"
                                />
                                {!isLast ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const nextPlans = [...form.plans];
                                      const nextBenefits = normalizeBenefitsForEditor(nextPlans[planIndex].benefits);
                                      nextBenefits.splice(benefitIndex, 1);
                                      nextPlans[planIndex] = {
                                        ...nextPlans[planIndex],
                                        benefits: normalizeBenefitsForEditor(nextBenefits),
                                      };
                                      setForm((prev) => ({ ...prev, plans: nextPlans }));
                                    }}
                                    className="h-9 px-3 rounded-lg bg-accent/10 border border-accent/20 text-accent text-[10px] font-black uppercase tracking-widest"
                                  >
                                    Remove
                                  </button>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col md:flex-row justify-end gap-4 pt-5 border-t border-white/10">
                <button onClick={closeForm} className="order-2 md:order-1 px-6 py-4 rounded-2xl font-black uppercase tracking-widest text-[11px] text-brand-text/40 hover:text-brand-text transition-colors">Cancel</button>
                <button
                  onClick={handleSave}
                  className="order-1 md:order-2 bg-primary px-10 py-4 rounded-2xl font-black text-brand-bg uppercase tracking-widest text-[11px] border-b-4 border-[#FF8C2A] shadow-xl shadow-primary/10 active:border-b-0 transition-all"
                >
                  {editingId ? 'Update Tool' : 'Create Tool'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 gap-6">
        {loading ? (
          <div className="text-center py-20 flex justify-center"><Loader2 className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
        ) : products.map((product) => {
          const productImage = resolveImageSource(product, {
            mediaPaths: ['imageMedia'],
            stringPaths: ['image', 'thumbnail'],
            placeholder: '/services-card.png',
          });
          return (
          <div key={product.id} className="glass rounded-[2rem] p-8 border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-primary/20 transition-all bg-brand-soft/20">
            <div className="flex items-center space-x-6">
              <div className="relative w-20 h-20 rounded-2xl overflow-hidden border border-white/10">
                <UploadedImage
                  src={productImage}
                  fallbackSrc="/services-card.png"
                  alt={product.title || product.name || 'Product'}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              </div>
              <div>
                <h3 className="font-black text-xl text-brand-text whitespace-pre-wrap break-words">{product.title || product.name}</h3>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  <span className="text-[10px] font-black tracking-widest text-brand-text/40">{product.categoryName || product.category || 'Uncategorized'}</span>
                  <span className="w-1 h-1 rounded-full bg-white/10" />
                  <span className="text-[10px] font-black tracking-widest text-brand-text/40">Rs {Number(product.price ?? 0)}</span>
                  {Number(product.salePrice || 0) > Number(product.price || 0) ? (
                    <span className="text-[10px] font-black tracking-widest text-brand-text/30 line-through">
                      Rs {Number(product.salePrice || 0)}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => openEditForm(product)}
                className="p-4 bg-white/5 hover:bg-white/10 rounded-2xl text-brand-text/60 transition-all border border-white/10"
              >
                <Edit2 className="w-5 h-5 text-primary" />
              </button>
              <button
                onClick={() => handleDelete(product.id)}
                className="p-4 bg-accent/10 hover:bg-accent/20 rounded-2xl text-accent transition-all border border-accent/20"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        )})}
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
        folder="tools"
        title="Tool Media Library"
        description="Choose an existing tool image or upload a new one from the same library."
        accept="image/*"
        relatedType="tool"
        relatedId={editingId || ''}
        replaceMediaId={form.imageMedia?.mediaId || ''}
      />
    </div>
  );
};

export default AdminProductsPage;

