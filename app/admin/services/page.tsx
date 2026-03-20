'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, onSnapshot } from 'firebase/firestore';
import { Plus, Edit2, Trash2, Save, X, Tv, Sparkles, Palette, Music, Cpu, BookOpen, Zap, Upload, Loader2, Image as ImageIcon } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { uploadFile } from '@/lib/storage-utils';

interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  icon: string;
  category: string;
  active: boolean;
  features: string[];
  orderIndex?: number;
  warranty?: string;
  accessType?: string;
  plans?: any[];
}

const AdminServices = () => {
  const { user, isAdmin } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});

  useEffect(() => {
    if (!isAdmin) return;

    const q = query(collection(db, 'services'), orderBy('name'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Service[];
      setServices(data);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching services:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isAdmin]);

  const handleEdit = (service: Service) => {
    setEditingId(service.id);
    setEditForm(service);
  };

  const handleSave = async () => {
    if (!editingId) return;
    try {
      await updateDoc(doc(db, 'services', editingId), editForm);
      setEditingId(null);
    } catch (error) {
      console.error('Error updating service:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this service?')) return;
    try {
      await deleteDoc(doc(db, 'services', id));
    } catch (error) {
      console.error('Error deleting service:', error);
    }
  };

  const handleAdd = async () => {
    try {
      await addDoc(collection(db, 'services'), {
        ...editForm,
        active: true,
        features: editForm.features || []
      });
      setIsAdding(false);
      setEditForm({});
    } catch (error) {
      console.error('Error adding service:', error);
    }
  };

  if (!isAdmin) {
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
            <h1 className="text-4xl font-bold">Manage <span className="text-primary">Services</span></h1>
            <p className="text-brand-text/60">Add, edit, or remove subscription services.</p>
          </div>
          <button 
            onClick={() => { setIsAdding(true); setEditForm({ name: '', description: '', price: 0, icon: 'Tv', category: 'Entertainment', features: [] }); }}
            className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-xl font-bold flex items-center space-x-2 transition-all"
          >
            <Plus className="w-5 h-5" />
            <span>Add Service</span>
          </button>
        </div>

        {isAdding && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-3xl p-8 mb-12 border-primary/20"
          >
            <h2 className="text-2xl font-bold mb-6">{editingId ? 'Edit Service' : 'New Service'}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
              <input 
                type="text" 
                placeholder="Service Name"
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-primary"
                value={editForm.name || ''}
                onChange={e => setEditForm({...editForm, name: e.target.value})}
              />
              <input 
                type="number" 
                placeholder="Base Price (Rs)"
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-primary"
                value={editForm.price || ''}
                onChange={e => setEditForm({...editForm, price: Number(e.target.value)})}
              />
              <input 
                type="number" 
                placeholder="Order Index (Weight)"
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-primary"
                value={editForm.orderIndex || 0}
                onChange={e => setEditForm({...editForm, orderIndex: Number(e.target.value)})}
              />
              <select 
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-primary"
                value={editForm.category || ''}
                onChange={e => setEditForm({...editForm, category: e.target.value})}
              >
                 <option value="Streaming">Streaming</option>
                 <option value="AI Tools">AI Tools</option>
                 <option value="Design">Design</option>
                 <option value="Web Dev">Web Dev</option>
                 <option value="App Dev">App Dev</option>
                 <option value="Tools">Tools</option>
                 <option value="Education">Education</option>
                 <option value="Gaming">Gaming</option>
              </select>
              <input 
                type="text" 
                placeholder="Warranty (e.g. 6 Months)"
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-primary"
                value={editForm.warranty || ''}
                onChange={e => setEditForm({...editForm, warranty: e.target.value})}
              />
              <input 
                type="text" 
                placeholder="Access Type (e.g. Shared)"
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-primary"
                value={editForm.accessType || ''}
                onChange={e => setEditForm({...editForm, accessType: e.target.value})}
              />
            </div>

            {/* Plans Management */}
            <div className="mb-8 p-6 glass border border-white/5 rounded-2xl">
               <div className="flex justify-between items-center mb-6">
                  <h3 className="text-sm font-black uppercase tracking-widest text-brand-text">Pricing Plans</h3>
                  <button 
                    onClick={() => {
                      const plans = editForm.plans || [];
                      setEditForm({...editForm, plans: [...plans, { planName: 'New Plan', ourPrice: 0, officialPrice: 0, benefits: ['Benefit 1'] }]});
                    }}
                    className="text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-400 px-4 py-2 rounded-lg border border-emerald-500/20"
                  >
                    Add Plan
                  </button>
               </div>
               <div className="space-y-4">
                  {(editForm.plans || []).map((plan: any, planIdx: number) => (
                    <div key={planIdx} className="bg-white/5 p-4 rounded-xl border border-white/5 space-y-3">
                       <div className="flex gap-4">
                          <input 
                            type="text" 
                            placeholder="Plan Name"
                            className="flex-1 bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-xs"
                            value={plan.name}
                            onChange={(e) => {
                              const plans = [...editForm.plans];
                              plans[planIdx].name = e.target.value;
                              setEditForm({...editForm, plans});
                            }}
                          />
                          <input 
                            type="number" 
                            placeholder="Price"
                            className="w-24 bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-xs"
                            value={plan.price}
                            onChange={(e) => {
                              const plans = [...editForm.plans];
                              plans[planIdx].price = Number(e.target.value);
                              setEditForm({...editForm, plans});
                            }}
                          />
                          <button 
                            onClick={() => {
                              const plans = editForm.plans.filter((_: any, i: number) => i !== planIdx);
                              setEditForm({...editForm, plans});
                            }}
                            className="text-accent p-2"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                       </div>
                       <div className="flex flex-wrap gap-2">
                          {plan.benefits.map((benefit: string, bIdx: number) => (
                            <div key={bIdx} className="flex items-center bg-white/5 px-3 py-1 rounded-lg border border-white/5">
                               <input 
                                 type="text" 
                                 className="bg-transparent border-none text-[10px] w-24 focus:ring-0"
                                 value={benefit}
                                 onChange={(e) => {
                                   const plans = [...editForm.plans];
                                   plans[planIdx].benefits[bIdx] = e.target.value;
                                   setEditForm({...editForm, plans});
                                 }}
                               />
                               <button onClick={() => {
                                 const plans = [...editForm.plans];
                                 plans[planIdx].benefits = plans[planIdx].benefits.filter((_: any, i: number) => i !== bIdx);
                                 setEditForm({...editForm, plans});
                               }}><X className="w-3 h-3 text-accent" /></button>
                            </div>
                          ))}
                          <button 
                            onClick={() => {
                              const plans = [...editForm.plans];
                              plans[planIdx].benefits.push('New Benefit');
                              setEditForm({...editForm, plans});
                            }}
                            className="text-[10px] text-primary"
                          >
                            + Add
                          </button>
                       </div>
                    </div>
                  ))}
               </div>
            </div>

            <div className="mb-6">
              <label className="block text-xs font-bold uppercase tracking-widest text-brand-text/40 mb-3 text-left">Service Thumbnail</label>
              <div className="flex items-center space-x-6">
                <div className="w-32 h-32 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center relative overflow-hidden group">
                  {editForm.image ? (
                    <>
                      <Image src={editForm.image} alt="Preview" fill className="object-cover" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <ImageIcon className="w-8 h-8 text-white" />
                      </div>
                    </>
                  ) : (
                    <ImageIcon className="w-10 h-10 text-brand-text/10" />
                  )}
                </div>
                <div className="flex-1">
                  <label className="inline-flex items-center space-x-2 bg-white/5 hover:bg-white/10 px-4 py-2.5 rounded-xl border border-white/10 cursor-pointer transition-colors">
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin text-primary" /> : <Upload className="w-4 h-4 text-primary" />}
                    <span className="text-xs font-bold uppercase tracking-widest">{uploading ? 'Uploading...' : 'Upload Image'}</span>
                    <input 
                      type="file" 
                      className="hidden" 
                      accept="image/*"
                      disabled={uploading}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setUploading(true);
                        try {
                          const url = await uploadFile(file, `services/${Date.now()}_${file.name}`, setUploadProgress);
                          setEditForm({ ...editForm, image: url });
                        } catch (error) {
                          alert('Failed to upload image');
                        } finally {
                          setUploading(false);
                          setUploadProgress(0);
                        }
                      }}
                    />
                  </label>
                  {uploading && (
                    <div className="mt-3 w-48 h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${uploadProgress}%` }}
                        className="h-full bg-primary"
                      />
                    </div>
                  )}
                  <p className="mt-2 text-[10px] text-brand-text/30 font-bold uppercase tracking-widest">Recommended: 800x600px • Max 5MB</p>
                </div>
              </div>
            </div>

            <textarea 
              placeholder="Description"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-primary mb-6 h-32"
              value={editForm.description || ''}
              onChange={e => setEditForm({...editForm, description: e.target.value})}
            />
            <div className="flex justify-end space-x-4">
              <button onClick={() => { setIsAdding(false); setEditingId(null); }} className="px-6 py-3 rounded-xl font-bold text-brand-text/60 hover:text-brand-text">Cancel</button>
              <button onClick={editingId ? handleSave : handleAdd} className="bg-primary px-10 py-3 rounded-xl font-bold text-black uppercase tracking-widest text-xs border-b-4 border-secondary shadow-lg">
                {editingId ? 'Save Overides' : 'Authorize Deployment'}
              </button>
            </div>
          </motion.div>
        )}

        <div className="grid grid-cols-1 gap-6">
          {loading ? (
            <div className="text-center py-20 flex justify-center"><div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
          ) : services.map(service => (
            <div key={service.id} className="glass rounded-[2rem] p-8 border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-primary/20 transition-all bg-brand-soft/20">
               <div className="flex items-center space-x-6">
                  <div className="relative w-20 h-20 rounded-2xl overflow-hidden border border-white/10">
                    <Image src={service.image} alt={service.name} fill className="object-cover" />
                  </div>
                  <div>
                    <h3 className="font-black text-xl uppercase text-brand-text">{service.name}</h3>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[10px] font-black uppercase tracking-widest text-primary">{service.category}</span>
                      <span className="w-1 h-1 rounded-full bg-white/10" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-brand-text/40">Rs {service.price}</span>
                      <span className="w-1 h-1 rounded-full bg-white/10" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-secondary">{service.orderIndex || 0} RANK</span>
                    </div>
                  </div>
               </div>
               <div className="flex items-center space-x-3">
                  <button 
                    onClick={() => { setEditingId(service.id); setEditForm(service); setIsAdding(true); }}
                    className="p-4 bg-white/5 hover:bg-white/10 rounded-2xl text-brand-text/60 transition-all border border-white/10"
                  >
                    <Edit2 className="w-5 h-5 text-primary" />
                  </button>
                  <button 
                    onClick={() => handleDelete(service.id)}
                    className="p-4 bg-accent/10 hover:bg-accent/20 rounded-2xl text-accent transition-all border border-accent/20"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
               </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminServices;
