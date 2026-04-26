'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/firebase';
import { collection, deleteDoc, doc, onSnapshot, orderBy, query, setDoc, updateDoc } from 'firebase/firestore';
import {
  Plus,
  Trash2,
  Ticket,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowLeft,
  Layers,
  Box,
  Globe,
} from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/components/ToastProvider';
import type { Category, ProductItem } from '@/lib/types/domain';
import { normalizeCoupon, normalizeCouponScope, type CouponScope } from '@/lib/coupons';

interface Coupon {
  id: string;
  code: string;
  discountPercentage: number;
  active: boolean;
  expiryDate?: string;
  scope?: CouponScope;
  categoryId?: string;
  categorySlug?: string;
  categoryName?: string;
  productId?: string;
  productSlug?: string;
  productName?: string;
}

function getProductTitle(product: ProductItem) {
  return (product.title || product.name || 'Untitled Product').trim();
}

function toSlug(value: string) {
  return value.toLowerCase().trim().replace(/\s+/g, '-');
}

const defaultCouponForm = {
  code: '',
  discountPercentage: 10,
  active: true,
  expiryDate: '',
  scope: 'global' as CouponScope,
  categoryId: '',
  categorySlug: '',
  categoryName: '',
  productId: '',
  productName: '',
  productSlug: '',
};

const AdminCoupons = () => {
  const { isStaff } = useAuth();
  const toast = useToast();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newCoupon, setNewCoupon] = useState(defaultCouponForm);

  useEffect(() => {
    if (!isStaff) return;

    const couponQuery = query(collection(db, 'coupons'), orderBy('code'));
    const unsubscribe = onSnapshot(
      couponQuery,
      (snapshot) => {
        const data = snapshot.docs.map((entry) => {
          const raw = entry.data() as Record<string, any>;
          const normalized = normalizeCoupon(raw, entry.id);
          return {
            id: entry.id,
            code: normalized.code,
            discountPercentage: normalized.discountPercentage,
            active: normalized.active,
            expiryDate: String(normalized.expiryDate || ''),
            scope: normalized.scope,
            categoryId: String(normalized.categoryId || ''),
            categorySlug: String(normalized.categorySlug || ''),
            categoryName: String(normalized.categoryName || ''),
            productId: String(normalized.productId || ''),
            productName: String(normalized.productName || ''),
            productSlug: String(normalized.productSlug || ''),
          } as Coupon;
        });
        setCoupons(data);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching coupons:', error);
        toast.error('Failed to load coupons');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [isStaff, toast]);

  useEffect(() => {
    if (!isStaff) return;

    const categoryQuery = query(collection(db, 'categories'), orderBy('sortOrder', 'asc'));
    const unsubscribeCategories = onSnapshot(categoryQuery, (snapshot) => {
      const docs = snapshot.docs
        .map((entry) => ({ id: entry.id, ...(entry.data() as Omit<Category, 'id'>) }))
        .filter((category) => category.active !== false);
      setCategories(docs);
    });

    const productQuery = query(collection(db, 'services'), orderBy('sortOrder', 'asc'));
    const unsubscribeProducts = onSnapshot(productQuery, (snapshot) => {
      const docs = snapshot.docs
        .map((entry) => ({ id: entry.id, ...(entry.data() as Omit<ProductItem, 'id'>) }))
        .filter((product) => product.active !== false)
        .sort((a, b) => getProductTitle(a).localeCompare(getProductTitle(b)));
      setProducts(docs);
    });

    return () => {
      unsubscribeCategories();
      unsubscribeProducts();
    };
  }, [isStaff]);

  const categoryOptions = useMemo(
    () =>
      categories.map((category) => ({
        id: category.id,
        name: category.name || 'Unnamed Category',
        slug: category.slug || toSlug(category.name || 'Unnamed Category'),
      })),
    [categories]
  );

  const productOptions = useMemo(
    () =>
      products.map((product) => ({
        id: product.id,
        name: getProductTitle(product),
        slug: toSlug((product.slug || getProductTitle(product)).toString()),
      })),
    [products]
  );

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i += 1) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewCoupon((prev) => ({ ...prev, code: result }));
  };

  const handleScopeChange = (scope: CouponScope) => {
    setNewCoupon((prev) => ({
      ...prev,
      scope,
      categoryId: '',
      categorySlug: '',
      categoryName: '',
      productId: '',
      productName: '',
      productSlug: '',
    }));
  };

  const handleSelectCategory = (categoryId: string) => {
    const selected = categoryOptions.find((entry) => entry.id === categoryId);
    setNewCoupon((prev) => ({
      ...prev,
      categoryId,
      categorySlug: selected?.slug || '',
      categoryName: selected?.name || '',
    }));
  };

  const handleSelectProduct = (productId: string) => {
    const selected = productOptions.find((entry) => entry.id === productId);
    setNewCoupon((prev) => ({
      ...prev,
      productId,
      productName: selected?.name || '',
      productSlug: selected?.slug || '',
    }));
  };

  const handleAdd = async () => {
    if (!newCoupon.code.trim()) {
      toast.error('Coupon code required');
      return;
    }

    if (newCoupon.discountPercentage <= 0 || newCoupon.discountPercentage > 100) {
      toast.error('Discount must be between 1 and 100');
      return;
    }

    if (newCoupon.scope === 'category' && !newCoupon.categoryId) {
      toast.error('Select a category for this coupon');
      return;
    }

    if (newCoupon.scope === 'product' && !newCoupon.productId) {
      toast.error('Select a product for this coupon');
      return;
    }

    try {
      const formattedCode = newCoupon.code.toUpperCase().trim();
      const payload = {
        code: formattedCode,
        discountPercentage: Number(newCoupon.discountPercentage),
        active: newCoupon.active,
        expiryDate: newCoupon.expiryDate || '',
        scope: newCoupon.scope,
        type: newCoupon.scope,
        couponType:
          newCoupon.scope === 'product'
            ? 'specific_item'
            : newCoupon.scope === 'category'
              ? 'category'
              : 'all_products',
        categoryId: newCoupon.scope === 'category' ? newCoupon.categoryId : '',
        categorySlug: newCoupon.scope === 'category' ? newCoupon.categorySlug : '',
        categoryName: newCoupon.scope === 'category' ? newCoupon.categoryName : '',
        productId: newCoupon.scope === 'product' ? newCoupon.productId : '',
        toolId: newCoupon.scope === 'product' ? newCoupon.productId : '',
        itemId: newCoupon.scope === 'product' ? newCoupon.productId : '',
        productName: newCoupon.scope === 'product' ? newCoupon.productName : '',
        productSlug: newCoupon.scope === 'product' ? newCoupon.productSlug : '',
        slug: newCoupon.scope === 'product' ? newCoupon.productSlug : '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'coupons', formattedCode), payload);
      setIsAdding(false);
      setNewCoupon(defaultCouponForm);
      toast.success('Coupon created');
    } catch (error) {
      console.error('Error adding coupon:', error);
      toast.error('Failed to create coupon', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'coupons', id), {
        active: !currentStatus,
        updatedAt: new Date().toISOString(),
      });
      toast.success('Coupon updated');
    } catch (error) {
      console.error('Error toggling coupon:', error);
      toast.error('Failed to update coupon');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this coupon code permanently?')) return;
    try {
      await deleteDoc(doc(db, 'coupons', id));
      toast.success('Coupon deleted');
    } catch (error) {
      console.error('Error deleting coupon:', error);
      toast.error('Failed to delete coupon');
    }
  };

  if (!isStaff) {
    return (
      <div className="pt-32 pb-24 text-center">
        <h1 className="text-3xl font-bold uppercase text-brand-text">Access Blocked</h1>
        <p className="mt-4 text-brand-text/40">Encryption key required for this sector.</p>
        <Link href="/" className="text-primary mt-8 inline-block font-black uppercase tracking-widest text-xs">
          Return to Surface
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="flex flex-col items-center justify-center text-center mb-10 gap-6">
        <div className="flex flex-col items-center">
          <h1 className="text-3xl md:text-5xl font-black uppercase text-brand-text leading-tight">
            Manage <span className="internal-gradient">Coupons</span>
          </h1>
          <p className="text-brand-text/40 text-[10px] md:text-sm font-black uppercase tracking-widest mt-2 px-10">
            Discount & Promotion Center
          </p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="w-full md:w-auto bg-primary text-brand-bg px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[11px] flex items-center justify-center gap-3 border-b-4 border-[#FF8C2A] shadow-xl shadow-primary/10 transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Generate Code</span>
        </button>
      </div>

      {isAdding ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="fixed inset-0 md:relative md:inset-auto w-full h-full md:h-auto bg-[#121212] md:bg-brand-soft/20 z-[60] md:z-auto overflow-y-auto md:overflow-visible rounded-none md:rounded-3xl p-6 md:p-8 mb-12 border-none md:border border-primary/20 backdrop-blur-3xl md:backdrop-blur-none"
        >
          <div className="max-w-5xl mx-auto pt-20 relative">
            <button
              onClick={() => setIsAdding(false)}
              className="absolute top-4 left-0 flex items-center gap-2 text-brand-text/40 hover:text-primary transition-colors py-2 px-4 bg-white/5 rounded-xl border border-white/5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">Abort Configuration</span>
            </button>

            <h2 className="text-2xl font-black mb-6 uppercase text-brand-text">New Coupon Configuration</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-brand-text/40 ml-2">
                  Coupon Code
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="EX: SAVE50"
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-primary text-sm font-black tracking-widest uppercase"
                    value={newCoupon.code}
                    onChange={(event) => setNewCoupon((prev) => ({ ...prev, code: event.target.value.toUpperCase() }))}
                  />
                  <button
                    onClick={generateCode}
                    className="px-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                  >
                    Auto
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-brand-text/40 ml-2">
                  Discount %
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  placeholder="10"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-primary text-sm font-black tracking-widest"
                  value={newCoupon.discountPercentage}
                  onChange={(event) =>
                    setNewCoupon((prev) => ({
                      ...prev,
                      discountPercentage: Number(event.target.value),
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-brand-text/40 ml-2">
                  Expiry (Optional)
                </label>
                <input
                  type="date"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-primary text-sm font-black tracking-widest"
                  value={newCoupon.expiryDate}
                  onChange={(event) => setNewCoupon((prev) => ({ ...prev, expiryDate: event.target.value }))}
                />
              </div>

              <div className="flex items-end pb-1 ml-4 gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-5 h-5 rounded-md border-white/10 bg-white/5 text-primary focus:ring-primary"
                    checked={newCoupon.active}
                    onChange={(event) => setNewCoupon((prev) => ({ ...prev, active: event.target.checked }))}
                  />
                  <span className="text-[10px] font-black uppercase tracking-widest text-brand-text">Active Now</span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-brand-text/40 ml-2">
                  Coupon Scope
                </label>
                <select
                  value={newCoupon.scope}
                  onChange={(event) => handleScopeChange(normalizeCouponScope(event.target.value))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-primary text-sm font-black tracking-widest uppercase"
                >
                  <option value="global">Global (All Products)</option>
                  <option value="category">Category Specific</option>
                  <option value="product">Specific Item / Tool</option>
                </select>
              </div>

              {newCoupon.scope === 'category' ? (
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-brand-text/40 ml-2">
                    Target Category
                  </label>
                  <select
                    value={newCoupon.categoryId}
                    onChange={(event) => handleSelectCategory(event.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-primary text-sm font-black tracking-widest"
                  >
                    <option value="">Select category</option>
                    {categoryOptions.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              {newCoupon.scope === 'product' ? (
                <div className="space-y-2 md:col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-brand-text/40 ml-2">
                    Target Product
                  </label>
                  <select
                    value={newCoupon.productId}
                    onChange={(event) => handleSelectProduct(event.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-primary text-sm font-black tracking-widest"
                  >
                    <option value="">Select product</option>
                    {productOptions.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
            </div>

            <div className="flex flex-col md:flex-row justify-end gap-4 p-6 border-t border-white/5 bg-black/40">
              <button
                onClick={() => setIsAdding(false)}
                className="order-2 md:order-1 px-6 py-4 rounded-2xl font-black uppercase tracking-widest text-[11px] text-brand-text/40 hover:text-brand-text transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                className="order-1 md:order-2 bg-primary px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-[11px] text-black border-b-4 border-secondary shadow-xl shadow-primary/10 active:border-b-0 transition-all"
              >
                Deploy Coupon
              </button>
            </div>
          </div>
        </motion.div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-20 flex justify-center">
            <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : coupons.length === 0 ? (
          <div className="col-span-full py-20 glass rounded-[2rem] border-white/5 text-center flex flex-col items-center">
            <AlertCircle className="w-12 h-12 text-brand-text/10 mb-4" />
            <p className="text-brand-text/40 font-black uppercase tracking-widest text-xs">
              No active coupons detected in the system.
            </p>
          </div>
        ) : (
          coupons.map((coupon) => {
            const scope = normalizeCouponScope(coupon.scope);
            const scopeLabel =
              scope === 'global' ? 'Global' : scope === 'category' ? 'Category' : 'Specific Item';
            const targetLabel =
              scope === 'category'
                ? coupon.categoryName || coupon.categorySlug || 'Unknown Category'
                : scope === 'product'
                  ? coupon.productName || coupon.productSlug || 'Unknown Product'
                  : 'All Products';

            return (
              <div key={coupon.id} className="glass rounded-[2rem] p-8 border border-white/5 relative group bg-brand-soft/10">
                <div className="flex justify-between items-start mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                    <Ticket className="w-6 h-6" />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleToggleActive(coupon.id, coupon.active)}
                      className={`p-2.5 rounded-xl border transition-all ${
                        coupon.active
                          ? 'bg-emerald-400/10 border-emerald-400/20 text-emerald-400'
                          : 'bg-brand-text/5 border-brand-text/10 text-brand-text/20'
                      }`}
                    >
                      {coupon.active ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => handleDelete(coupon.id)}
                      className="p-2.5 bg-accent/10 hover:bg-accent/20 border border-accent/20 rounded-xl text-accent transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-2xl font-black text-brand-text tracking-widest leading-none">{coupon.code}</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-3xl font-black text-primary">{coupon.discountPercentage}%</span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-brand-text/40">OFF</span>
                  </div>

                  <div className="inline-flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-brand-text/55 bg-white/5 py-2 px-3 rounded-lg">
                    {scope === 'global' ? (
                      <Globe className="w-3.5 h-3.5" />
                    ) : scope === 'category' ? (
                      <Layers className="w-3.5 h-3.5" />
                    ) : (
                      <Box className="w-3.5 h-3.5" />
                    )}
                    {scopeLabel}
                  </div>

                  <div className="text-[10px] font-black uppercase tracking-widest text-brand-text/35 whitespace-pre-wrap break-words">
                    Applies To: <span className="text-brand-text/70">{targetLabel}</span>
                  </div>

                  {coupon.expiryDate ? (
                    <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-brand-text/30 bg-white/5 py-2 px-3 rounded-lg w-fit">
                      <Calendar className="w-3 h-3" />
                      Expires: {coupon.expiryDate}
                    </div>
                  ) : null}
                </div>

                <div className="absolute transition-opacity inset-0 border-2 border-primary/0 group-hover:border-primary/10 rounded-[2rem] pointer-events-none" />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default AdminCoupons;
