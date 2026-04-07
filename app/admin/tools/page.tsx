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
  Timestamp,
} from 'firebase/firestore';
import {
  Plus,
  Edit2,
  Trash2,
  X,
  Upload,
  Loader2,
  Image as ImageIcon,
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { uploadFile } from '@/lib/storage-utils';
import type { Category, ProductItem, ProductPlan } from '@/lib/types/domain';
import { useToast } from '@/components/ToastProvider';

interface ProductForm {
  title: string;
  slug: string;
  description: string;
  longDescription: string;
  price: number;
  salePrice: number;
  categoryId: string;
  categoryName: string;
  image: string;
  featured: boolean;
  active: boolean;
  sortOrder: number;
  durationType: 'fixed_days' | 'fixed_months' | 'fixed_years' | 'custom_expiry' | 'lifetime';
  durationValue: number;
  customExpiryAt: string;
  activationBehavior: 'activate_on_approval' | 'manual_activation';
  accessType: 'subscription' | 'one_time_service' | 'renewable_membership' | 'tool_access';
  renewable: boolean;
  deliveryStatus: string;
  accessLabel: string;
  warranty: string;
  planType: string;
  checkoutInstructions: string;
  plans: ProductPlan[];
}

const defaultForm: ProductForm = {
  title: '',
  slug: '',
  description: '',
  longDescription: '',
  price: 0,
  salePrice: 0,
  categoryId: '',
  categoryName: '',
  image: '',
  featured: false,
  active: true,
  sortOrder: 0,
  durationType: 'fixed_months',
  durationValue: 1,
  customExpiryAt: '',
  activationBehavior: 'activate_on_approval',
  accessType: 'subscription',
  renewable: false,
  deliveryStatus: '',
  accessLabel: '',
  warranty: '',
  planType: '',
  checkoutInstructions: '',
  plans: [],
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function mapDocToForm(item: ProductItem): ProductForm {
  const customExpiryDate = item.customExpiryAt?.toDate?.() || (item.customExpiryAt ? new Date(item.customExpiryAt) : null);
  const formattedCustomDate = customExpiryDate
    ? `${customExpiryDate.getFullYear()}-${String(customExpiryDate.getMonth() + 1).padStart(2, '0')}-${String(customExpiryDate.getDate()).padStart(2, '0')}`
    : '';

  return {
    title: item.title || item.name || '',
    slug: item.slug || slugify(item.title || item.name || ''),
    description: item.description || '',
    longDescription: item.longDescription || '',
    price: Number(item.price || 0),
    salePrice: Number(item.salePrice || 0),
    categoryId: item.categoryId || '',
    categoryName: item.categoryName || item.category || '',
    image: item.image || item.thumbnail || '',
    featured: Boolean(item.featured),
    active: item.active !== false,
    sortOrder: Number(item.sortOrder ?? item.orderIndex ?? 0),
    durationType: (item.durationType || 'fixed_months') as ProductForm['durationType'],
    durationValue: Number(item.durationValue || 1),
    customExpiryAt: formattedCustomDate,
    activationBehavior: (item.activationBehavior || 'activate_on_approval') as ProductForm['activationBehavior'],
    accessType: (item.accessType || 'subscription') as ProductForm['accessType'],
    renewable: Boolean(item.renewable),
    deliveryStatus: item.deliveryStatus || '',
    accessLabel: item.accessLabel || item.accessType || '',
    warranty: item.warranty || '',
    planType: item.planType || '',
    checkoutInstructions: item.checkoutInstructions || '',
    plans: Array.isArray(item.plans) ? item.plans : [],
  };
}

const AdminProductsPage = () => {
  const { isStaff } = useAuth();
  const toast = useToast();
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [uploading, setUploading] = useState(false);
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
  }, [isStaff]);

  const visibleCategories = useMemo(
    () => categories.filter((category) => category.active !== false && (category.type === 'tools' || category.type === 'both')),
    [categories]
  );

  const formModeLabel = editingId ? 'Edit Tool' : 'Add Tool';

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
    setForm({ ...defaultForm, sortOrder: products.length });
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

    const selectedCategory = categories.find((category) => category.id === form.categoryId);
    const customExpiryDate = form.customExpiryAt ? new Date(`${form.customExpiryAt}T00:00:00`) : null;

    const payload = {
      title: form.title.trim(),
      name: form.title.trim(),
      slug: slugify(form.slug || form.title),
      description: form.description.trim(),
      longDescription: form.longDescription.trim(),
      price: Number(form.price || 0),
      salePrice: Number(form.salePrice || 0),
      type: 'tools',
      categoryId: form.categoryId || '',
      categoryName: selectedCategory?.name || form.categoryName || '',
      category: selectedCategory?.name || form.categoryName || '',
      image: form.image,
      thumbnail: form.image,
      featured: form.featured,
      active: form.active,
      sortOrder: Number(form.sortOrder || 0),
      orderIndex: Number(form.sortOrder || 0),
      durationType: form.durationType,
      durationValue: form.durationType === 'lifetime' ? null : Number(form.durationValue || 1),
      customExpiryAt: form.durationType === 'custom_expiry' && customExpiryDate ? Timestamp.fromDate(customExpiryDate) : null,
      activationBehavior: form.activationBehavior,
      accessType: form.accessType,
      renewable: form.renewable,
      deliveryStatus: form.deliveryStatus.trim(),
      accessLabel: form.accessLabel.trim(),
      warranty: form.warranty.trim(),
      planType: form.planType.trim(),
      checkoutInstructions: form.checkoutInstructions.trim(),
      plans: form.plans,
      updatedAt: serverTimestamp(),
    };

    try {
      if (editingId) {
        await updateDoc(doc(db, 'services', editingId), payload);
        toast.success('Tool updated');
      } else {
        await addDoc(collection(db, 'services'), {
          ...payload,
          createdAt: serverTimestamp(),
        });
        toast.success('Tool created');
      }
      closeForm();
    } catch (error) {
      console.error('Failed to save tool:', error);
      toast.error('Failed to save tool', error instanceof Error ? error.message : 'Please try again.');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this tool?')) {
      return;
    }

    try {
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <input
                  type="text"
                  value={form.title}
                  onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value, slug: slugify(event.target.value) }))}
                  placeholder="Title"
                  className="bg-white/5 border border-white/10 rounded-xl px-4 py-3"
                />
                <input
                  type="text"
                  value={form.slug}
                  onChange={(event) => setForm((prev) => ({ ...prev, slug: slugify(event.target.value) }))}
                  placeholder="Slug"
                  className="bg-white/5 border border-white/10 rounded-xl px-4 py-3"
                />
                <select
                  value={form.categoryId}
                  onChange={(event) => {
                    const category = categories.find((item) => item.id === event.target.value);
                    setForm((prev) => ({ ...prev, categoryId: event.target.value, categoryName: category?.name || '' }));
                  }}
                  className="bg-white/5 border border-white/10 rounded-xl px-4 py-3"
                >
                  <option value="">Select category</option>
                  {visibleCategories.map((category) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
                <input
                  type="number"
                  value={form.price}
                  onChange={(event) => setForm((prev) => ({ ...prev, price: Number(event.target.value) }))}
                  placeholder="Price"
                  className="bg-white/5 border border-white/10 rounded-xl px-4 py-3"
                />
                <input
                  type="number"
                  value={form.salePrice}
                  onChange={(event) => setForm((prev) => ({ ...prev, salePrice: Number(event.target.value) }))}
                  placeholder="Sale price (optional)"
                  className="bg-white/5 border border-white/10 rounded-xl px-4 py-3"
                />
                <input
                  type="number"
                  value={form.sortOrder}
                  onChange={(event) => setForm((prev) => ({ ...prev, sortOrder: Number(event.target.value) }))}
                  placeholder="Sort order"
                  className="bg-white/5 border border-white/10 rounded-xl px-4 py-3"
                />
                <select
                  value={form.accessType}
                  onChange={(event) => setForm((prev) => ({ ...prev, accessType: event.target.value as ProductForm['accessType'] }))}
                  className="bg-white/5 border border-white/10 rounded-xl px-4 py-3"
                >
                  <option value="subscription">Subscription</option>
                  <option value="one_time_service">One-time service</option>
                  <option value="renewable_membership">Renewable membership</option>
                  <option value="tool_access">Tool access</option>
                </select>
                <select
                  value={form.durationType}
                  onChange={(event) => setForm((prev) => ({ ...prev, durationType: event.target.value as ProductForm['durationType'] }))}
                  className="bg-white/5 border border-white/10 rounded-xl px-4 py-3"
                >
                  <option value="fixed_days">Fixed days</option>
                  <option value="fixed_months">Fixed months</option>
                  <option value="fixed_years">Fixed years</option>
                  <option value="custom_expiry">Custom expiry</option>
                  <option value="lifetime">Lifetime</option>
                </select>
                {form.durationType !== 'lifetime' && form.durationType !== 'custom_expiry' ? (
                  <input
                    type="number"
                    value={form.durationValue}
                    onChange={(event) => setForm((prev) => ({ ...prev, durationValue: Number(event.target.value) }))}
                    placeholder="Duration value"
                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-3"
                  />
                ) : null}
                {form.durationType === 'custom_expiry' ? (
                  <input
                    type="date"
                    value={form.customExpiryAt}
                    onChange={(event) => setForm((prev) => ({ ...prev, customExpiryAt: event.target.value }))}
                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-3"
                  />
                ) : null}
                <select
                  value={form.activationBehavior}
                  onChange={(event) => setForm((prev) => ({ ...prev, activationBehavior: event.target.value as ProductForm['activationBehavior'] }))}
                  className="bg-white/5 border border-white/10 rounded-xl px-4 py-3"
                >
                  <option value="activate_on_approval">Activate on admin approval</option>
                  <option value="manual_activation">Manual activation</option>
                </select>
                <input
                  type="text"
                  value={form.deliveryStatus}
                  onChange={(event) => setForm((prev) => ({ ...prev, deliveryStatus: event.target.value }))}
                  placeholder="Delivery (e.g. Instant)"
                  className="bg-white/5 border border-white/10 rounded-xl px-4 py-3"
                />
                <input
                  type="text"
                  value={form.accessLabel}
                  onChange={(event) => setForm((prev) => ({ ...prev, accessLabel: event.target.value }))}
                  placeholder="Access (e.g. Subscription)"
                  className="bg-white/5 border border-white/10 rounded-xl px-4 py-3"
                />
                <input
                  type="text"
                  value={form.warranty}
                  onChange={(event) => setForm((prev) => ({ ...prev, warranty: event.target.value }))}
                  placeholder="Warranty (e.g. Full)"
                  className="bg-white/5 border border-white/10 rounded-xl px-4 py-3"
                />
                <input
                  type="text"
                  value={form.planType}
                  onChange={(event) => setForm((prev) => ({ ...prev, planType: event.target.value }))}
                  placeholder="Plan Type (e.g. Individual)"
                  className="bg-white/5 border border-white/10 rounded-xl px-4 py-3"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
                <label className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest">
                  Active
                  <input type="checkbox" checked={form.active} onChange={(event) => setForm((prev) => ({ ...prev, active: event.target.checked }))} />
                </label>
                <label className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest">
                  Featured
                  <input type="checkbox" checked={form.featured} onChange={(event) => setForm((prev) => ({ ...prev, featured: event.target.checked }))} />
                </label>
                <label className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest">
                  Renewable
                  <input type="checkbox" checked={form.renewable} onChange={(event) => setForm((prev) => ({ ...prev, renewable: event.target.checked }))} />
                </label>
              </div>

              <div className="mb-6">
                <label className="block text-xs font-bold uppercase tracking-widest text-brand-text/40 mb-3 text-left">Tool Image</label>
                <div className="flex items-center space-x-6">
                  <div className="w-32 h-32 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center relative overflow-hidden group">
                    {form.image ? (
                      <Image src={form.image} alt="Preview" fill className="object-cover" />
                    ) : (
                      <ImageIcon className="w-10 h-10 text-brand-text/10" />
                    )}
                  </div>
                  <div className="flex-1">
                    <input
                      type="text"
                      value={form.image}
                      onChange={(event) => setForm((prev) => ({ ...prev, image: event.target.value }))}
                      placeholder="Image URL"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 mb-3"
                    />
                    <label className="inline-flex items-center space-x-2 bg-white/5 hover:bg-white/10 px-4 py-2.5 rounded-xl border border-white/10 cursor-pointer transition-colors">
                      {uploading ? <Loader2 className="w-4 h-4 animate-spin text-primary" /> : <Upload className="w-4 h-4 text-primary" />}
                      <span className="text-xs font-bold uppercase tracking-widest">Upload Image</span>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        disabled={uploading}
                        onChange={async (event) => {
                          const file = event.target.files?.[0];
                          if (!file) {
                            return;
                          }

                          setUploading(true);
                          try {
                            const url = await uploadFile(file, `services/${Date.now()}_${file.name}`);
                            setForm((prev) => ({ ...prev, image: url }));
                          } catch (error) {
                            console.error('Failed to upload tool image:', error);
                            toast.error('Image upload failed');
                          } finally {
                            setUploading(false);
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>

              <textarea
                value={form.description}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                placeholder="Short description"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 mb-4 h-24"
              />
              <textarea
                value={form.longDescription}
                onChange={(event) => setForm((prev) => ({ ...prev, longDescription: event.target.value }))}
                placeholder="Long description"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 mb-4 h-32"
              />
              <textarea
                value={form.checkoutInstructions}
                onChange={(event) => setForm((prev) => ({ ...prev, checkoutInstructions: event.target.value }))}
                placeholder="Checkout instructions (optional)"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 mb-6 h-24"
              />

              <div className="mb-8 p-6 glass border border-white/5 rounded-2xl">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-black uppercase tracking-widest text-brand-text">Plans / Packages</h3>
                  <button
                    onClick={() => {
                      setForm((prev) => ({
                        ...prev,
                        plans: [...prev.plans, { planName: 'Standard', ourPrice: prev.price || 0, officialPrice: prev.price ? prev.price * 1.5 : 0, benefits: [] }],
                      }));
                    }}
                    className="text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-400 px-4 py-2 rounded-lg border border-emerald-500/20"
                  >
                    Add Plan
                  </button>
                </div>

                <div className="space-y-4">
                  {form.plans.map((plan, planIndex) => (
                    <div key={`${plan.planName}-${planIndex}`} className="bg-black/30 border border-white/10 rounded-xl p-4 space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <input
                          type="text"
                          value={plan.planName}
                          onChange={(event) => {
                            const nextPlans = [...form.plans];
                            nextPlans[planIndex] = { ...nextPlans[planIndex], planName: event.target.value };
                            setForm((prev) => ({ ...prev, plans: nextPlans }));
                          }}
                          placeholder="Plan name"
                          className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm"
                        />
                        <input
                          type="number"
                          value={plan.ourPrice}
                          onChange={(event) => {
                            const nextPlans = [...form.plans];
                            nextPlans[planIndex] = { ...nextPlans[planIndex], ourPrice: Number(event.target.value) };
                            setForm((prev) => ({ ...prev, plans: nextPlans }));
                          }}
                          placeholder="Current price"
                          className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm"
                        />
                        <input
                          type="number"
                          value={plan.officialPrice || 0}
                          onChange={(event) => {
                            const nextPlans = [...form.plans];
                            nextPlans[planIndex] = { ...nextPlans[planIndex], officialPrice: Number(event.target.value) };
                            setForm((prev) => ({ ...prev, plans: nextPlans }));
                          }}
                          placeholder="Original price"
                          className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm"
                        />
                        <button
                          onClick={() => {
                            setForm((prev) => ({ ...prev, plans: prev.plans.filter((_, idx) => idx !== planIndex) }));
                          }}
                          className="bg-accent/10 border border-accent/20 rounded-xl text-accent text-xs font-black uppercase tracking-widest"
                        >
                          Remove
                        </button>
                      </div>
                      <input
                        type="text"
                        value={(plan.benefits || []).join(', ')}
                        onChange={(event) => {
                          const nextPlans = [...form.plans];
                          nextPlans[planIndex] = {
                            ...nextPlans[planIndex],
                            benefits: event.target.value.split(',').map((benefit) => benefit.trim()).filter(Boolean),
                          };
                          setForm((prev) => ({ ...prev, plans: nextPlans }));
                        }}
                        placeholder="Benefits (comma separated)"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col md:flex-row justify-end gap-4 p-6 border-t border-white/5 bg-black/40">
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
        ) : products.map((product) => (
          <div key={product.id} className="glass rounded-[2rem] p-8 border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-primary/20 transition-all bg-brand-soft/20">
            <div className="flex items-center space-x-6">
              <div className="relative w-20 h-20 rounded-2xl overflow-hidden border border-white/10">
                <Image src={product.image || product.thumbnail || '/services-card.png'} alt={product.title || product.name || 'Product'} fill className="object-cover" />
              </div>
              <div>
                <h3 className="font-black text-xl uppercase text-brand-text">{product.title || product.name}</h3>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  <span className="text-[10px] font-black uppercase tracking-widest text-brand-text/40">{product.categoryName || product.category || 'Uncategorized'}</span>
                  <span className="w-1 h-1 rounded-full bg-white/10" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-brand-text/40">Rs {Number(product.salePrice ?? product.price ?? 0)}</span>
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
        ))}
      </div>
    </div>
  );
};

export default AdminProductsPage;

