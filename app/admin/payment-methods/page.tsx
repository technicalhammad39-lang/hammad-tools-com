'use client';

import { useEffect, useState } from 'react';
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
import type { PaymentMethod } from '@/lib/types/domain';
import { Loader2, Plus, Edit2, Trash2, Save, X } from 'lucide-react';
import { useToast } from '@/components/ToastProvider';

const defaultForm: Partial<PaymentMethod> = {
  name: '',
  paymentType: 'standard',
  accountTitle: '',
  accountNumber: '',
  instructions: '',
  active: true,
};

function normalizePaymentType(method: Partial<PaymentMethod>) {
  if (method.paymentType === 'manual_chat') {
    return 'manual_chat' as const;
  }
  const normalizedName = (method.name || '').trim().toLowerCase();
  if (normalizedName.includes('manual')) {
    return 'manual_chat' as const;
  }
  return 'standard' as const;
}

export default function AdminPaymentMethodsPage() {
  const { isAdmin } = useAuth();
  const toast = useToast();
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<PaymentMethod>>(defaultForm);

  useEffect(() => {
    if (!isAdmin) {
      return;
    }

    const q = query(collection(db, 'payment_methods'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setMethods(snapshot.docs.map((snap) => ({ id: snap.id, ...(snap.data() as Omit<PaymentMethod, 'id'>) })));
        setLoading(false);
      },
      (error) => {
        console.error('Failed to load payment methods:', error);
        toast.error('Failed to load payment methods', 'Check your Firebase connection.');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [isAdmin, toast]);

  if (!isAdmin) {
    return <div className="p-10 text-center font-black uppercase tracking-widest">Access Denied</div>;
  }

  async function handleSave() {
    const paymentType = normalizePaymentType(form);
    if (!form.name?.trim()) {
      toast.error('Missing required fields', 'Method name is required.');
      return;
    }
    if (paymentType === 'standard' && (!form.accountTitle?.trim() || !form.accountNumber?.trim())) {
      toast.error('Missing required fields', 'Account title and number are required for standard payments.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        paymentType,
        accountTitle:
          paymentType === 'manual_chat'
            ? (form.accountTitle?.trim() || 'Manual Chat')
            : form.accountTitle!.trim(),
        accountNumber:
          paymentType === 'manual_chat'
            ? (form.accountNumber?.trim() || 'WhatsApp')
            : form.accountNumber!.trim(),
        instructions: form.instructions?.trim() || '',
        active: Boolean(form.active),
        updatedAt: serverTimestamp(),
      };

      if (editingId) {
        await updateDoc(doc(db, 'payment_methods', editingId), payload);
        toast.success('Payment method updated');
      } else {
        await addDoc(collection(db, 'payment_methods'), {
          ...payload,
          createdAt: serverTimestamp(),
        });
        toast.success('Payment method created');
      }

      setIsFormOpen(false);
      setEditingId(null);
      setForm(defaultForm);
    } catch (error) {
      console.error('Failed to save payment method:', error);
      toast.error('Failed to save payment method', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this payment method?')) {
      return;
    }
    try {
      await deleteDoc(doc(db, 'payment_methods', id));
      toast.success('Payment method deleted');
    } catch (error) {
      console.error('Failed to delete payment method:', error);
      toast.error('Failed to delete payment method', error instanceof Error ? error.message : 'Please try again.');
    }
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black uppercase text-brand-text">Payment <span className="text-primary">Methods</span></h1>
          <p className="text-brand-text/40 text-[10px] font-black uppercase tracking-[0.3em] mt-2">Dynamic Checkout Accounts</p>
        </div>
        <button
          onClick={() => {
            setIsFormOpen(true);
            setEditingId(null);
            setForm({ ...defaultForm });
          }}
          className="bg-primary text-black px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] border-b-4 border-secondary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add Method
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
                <h2 className="text-xl font-black uppercase text-brand-text">{editingId ? 'Edit Method' : 'Create Method'}</h2>
                <p className="text-[9px] text-brand-text/30 font-black uppercase tracking-widest">Checkout payment channels</p>
              </div>
              <button onClick={() => setIsFormOpen(false)} className="p-2 rounded-lg bg-white/5 text-brand-text/40 hover:text-accent">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                value={form.name || ''}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Method name (e.g. JazzCash)"
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary"
              />
              <select
                value={normalizePaymentType(form)}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, paymentType: event.target.value as 'standard' | 'manual_chat' }))
                }
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary"
              >
                <option value="standard">Standard Payment</option>
                <option value="manual_chat">Manual Chat (WhatsApp)</option>
              </select>
              <input
                type="text"
                value={form.accountTitle || ''}
                onChange={(event) => setForm((prev) => ({ ...prev, accountTitle: event.target.value }))}
                placeholder={normalizePaymentType(form) === 'manual_chat' ? 'Optional label (e.g. Manual Chat)' : 'Account title'}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary"
              />
              <input
                type="text"
                value={form.accountNumber || ''}
                onChange={(event) => setForm((prev) => ({ ...prev, accountNumber: event.target.value }))}
                placeholder={normalizePaymentType(form) === 'manual_chat' ? 'Optional contact (e.g. WhatsApp)' : 'Account / Wallet number'}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary"
              />
              <div className="md:col-span-2">
                <textarea
                  value={form.instructions || ''}
                  onChange={(event) => setForm((prev) => ({ ...prev, instructions: event.target.value }))}
                  placeholder="Payment instructions"
                  className="w-full h-24 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary resize-none"
                />
              </div>

              <div className="md:col-span-2 flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                <span className="text-xs font-black uppercase tracking-widest text-brand-text/40">Method Active</span>
                <input
                  type="checkbox"
                  checked={Boolean(form.active)}
                  onChange={(event) => setForm((prev) => ({ ...prev, active: event.target.checked }))}
                  className="w-4 h-4"
                />
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
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Method
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div className="py-20 flex justify-center"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
        ) : methods.length === 0 ? (
          <div className="glass rounded-2xl border border-white/5 p-10 text-center text-brand-text/30 text-xs uppercase tracking-widest font-black">
            No payment methods configured.
          </div>
        ) : (
          methods.map((method) => (
            <div key={method.id} className="glass rounded-2xl border border-white/5 p-6 flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-black uppercase text-brand-text">{method.name}</h3>
                  <span className={`text-[9px] px-3 py-1 rounded-full border font-black uppercase tracking-widest ${normalizePaymentType(method) === 'manual_chat' ? 'bg-primary/15 text-primary border-primary/35' : 'bg-white/5 text-brand-text/60 border-white/10'}`}>
                    {normalizePaymentType(method) === 'manual_chat' ? 'Manual Chat' : 'Standard'}
                  </span>
                  <span className={`text-[9px] px-3 py-1 rounded-full border font-black uppercase tracking-widest ${method.active ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-accent/10 text-accent border-accent/20'}`}>
                    {method.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest text-primary">{method.accountTitle} · {method.accountNumber}</p>
                {method.instructions ? (
                  <p className="text-[9px] uppercase tracking-widest text-brand-text/30 font-black">{method.instructions}</p>
                ) : null}
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setEditingId(method.id);
                    setForm({
                      ...method,
                      paymentType: normalizePaymentType(method),
                    });
                    setIsFormOpen(true);
                  }}
                  className="p-3 rounded-xl bg-white/5 border border-white/10 text-primary hover:bg-white/10"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(method.id)}
                  className="p-3 rounded-xl bg-accent/10 border border-accent/20 text-accent hover:bg-accent/20"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

