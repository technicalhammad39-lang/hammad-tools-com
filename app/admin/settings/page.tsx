'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Settings, Save, Loader2, ShieldCheck, Globe, Bell } from 'lucide-react';
import { useToast } from '@/components/ToastProvider';

const AdminSettings = () => {
  const { isAdmin } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [siteConfig, setSiteConfig] = useState({
    siteName: 'Hammad Tools',
    contactEmail: 'hammadkhaksar56@gmail.com',
    contactPhone: '+92 320 9310656',
    maintenanceMode: false,
    seoTitle: 'Hammad Tools | Premium Subscription & Software Marketplace',
    seoDescription: 'Unlock premium digital tools and pro courses at the best prices.',
  });

  const fetchSettings = useCallback(async () => {
    try {
      const docSnap = await getDoc(doc(db, 'settings', 'general'));
      if (docSnap.exists()) {
        setSiteConfig(docSnap.data() as any);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (isAdmin) {
      void fetchSettings();
    }
  }, [isAdmin, fetchSettings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'general'), {
        ...siteConfig,
        updatedAt: serverTimestamp()
      });
      toast.success('Settings updated');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!isAdmin) return <div className="p-10 text-center">Access Denied</div>;

  return (
    <div className="max-w-4xl space-y-10">
      <div className="border-l-4 border-primary pl-8 py-2">
        <h1 className="text-4xl font-black uppercase text-brand-text mb-2">Global <span className="text-primary">Configuration</span></h1>
        <p className="text-brand-text/40 text-xs font-black uppercase tracking-widest leading-loose">Manage site-wide variables, contact information, and meta configurations.</p>
      </div>

      <div className="glass rounded-[2.5rem] border border-white/5 p-10 shadow-3xl">
        {loading ? (
          <div className="py-20 text-center text-primary font-black uppercase tracking-widest text-xs animate-pulse">Accessing Core Config...</div>
        ) : (
          <form onSubmit={handleSave} className="space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-brand-text/40 ml-4">Site Identity</label>
                <input 
                  type="text" 
                  value={siteConfig.siteName}
                  onChange={e => setSiteConfig({...siteConfig, siteName: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 focus:outline-none focus:border-primary text-brand-text font-bold"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-brand-text/40 ml-4">Contact Protocol (Email)</label>
                <input 
                  type="email" 
                  value={siteConfig.contactEmail}
                  onChange={e => setSiteConfig({...siteConfig, contactEmail: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 focus:outline-none focus:border-primary text-brand-text font-bold"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-brand-text/40 ml-4">SEO Prime Title</label>
              <input 
                type="text" 
                value={siteConfig.seoTitle}
                onChange={e => setSiteConfig({...siteConfig, seoTitle: e.target.value})}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 focus:outline-none focus:border-primary text-brand-text font-bold"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-brand-text/40 ml-4">SEO Meta Description</label>
              <textarea 
                value={siteConfig.seoDescription}
                onChange={e => setSiteConfig({...siteConfig, seoDescription: e.target.value})}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 focus:outline-none focus:border-primary text-brand-text font-bold h-32"
              />
            </div>

            <div className="flex items-center justify-between p-6 bg-white/5 border border-white/10 rounded-2xl">
               <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center text-accent border border-accent/20">
                     <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-black uppercase tracking-widest text-brand-text">Maintenance Mode</div>
                    <div className="text-[10px] text-brand-text/40 font-black uppercase tracking-widest mt-1">Lock system for public access</div>
                  </div>
               </div>
               <input 
                 type="checkbox" 
                 checked={siteConfig.maintenanceMode}
                 onChange={e => setSiteConfig({...siteConfig, maintenanceMode: e.target.checked})}
                 className="w-12 h-6 appearance-none bg-white/10 rounded-full checked:bg-accent transition-all cursor-pointer relative after:content-[''] after:absolute after:top-1 after:left-1 after:w-4 after:h-4 after:bg-white after:rounded-full after:transition-all checked:after:left-[unset] checked:after:right-1"
               />
            </div>

            <button 
              disabled={saving}
              className="w-full bg-primary text-brand-bg py-5 rounded-2xl font-black uppercase tracking-widest border-b-4 border-[#FF8C2A] shadow-lg shadow-primary/10 flex items-center justify-center space-x-2"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              <span>{saving ? 'Engaging Core Override...' : 'Engage Configuration'}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default AdminSettings;
