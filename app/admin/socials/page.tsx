'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Share2, Save, Loader2, Facebook, Twitter, Instagram, Youtube, Linkedin, Globe } from 'lucide-react';

const AdminSocials = () => {
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [socials, setSocials] = useState({
    facebook: '',
    twitter: '',
    instagram: '',
    youtube: '',
    linkedin: '',
    whatsapp: '923209310656'
  });

  useEffect(() => {
    if (isAdmin) {
      fetchSocials();
    }
  }, [isAdmin]);

  const fetchSocials = async () => {
    try {
      const docSnap = await getDoc(doc(db, 'settings', 'socials'));
      if (docSnap.exists()) {
        setSocials(docSnap.data() as any);
      }
    } catch (error) {
      console.error('Error fetching socials:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'socials'), {
        ...socials,
        updatedAt: serverTimestamp()
      });
      alert('Social links updated successfully!');
    } catch (error) {
      console.error('Error saving socials:', error);
    } finally {
      setSaving(false);
    }
  };

  if (!isAdmin) return <div className="p-10 text-center">Access Denied</div>;

  return (
    <div className="max-w-4xl space-y-10">
      <div className="border-l-4 border-primary pl-8 py-2">
        <h1 className="text-4xl font-black uppercase text-brand-text mb-2">Social <span className="text-primary">Connections</span></h1>
        <p className="text-brand-text/40 text-xs font-black uppercase tracking-widest leading-loose">Configure global social media links and communication portals.</p>
      </div>

      <div className="glass rounded-[2.5rem] border border-white/5 p-10 shadow-3xl">
        {loading ? (
          <div className="py-20 text-center text-primary font-black uppercase tracking-widest text-xs animate-pulse">Syncing Social Data...</div>
        ) : (
          <form onSubmit={handleSave} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-brand-text/40 ml-4 flex items-center gap-2">
                   <Facebook className="w-3 h-3" /> Facebook URL
                </label>
                <input 
                  type="text" 
                  value={socials.facebook}
                  onChange={e => setSocials({...socials, facebook: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 focus:outline-none focus:border-primary transition-colors text-brand-text font-bold"
                  placeholder="https://facebook.com/..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-brand-text/40 ml-4 flex items-center gap-2">
                   <Twitter className="w-3 h-3" /> Twitter URL
                </label>
                <input 
                  type="text" 
                  value={socials.twitter}
                  onChange={e => setSocials({...socials, twitter: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 focus:outline-none focus:border-primary transition-colors text-brand-text font-bold"
                  placeholder="https://twitter.com/..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-brand-text/40 ml-4 flex items-center gap-2">
                   <Instagram className="w-3 h-3" /> Instagram URL
                </label>
                <input 
                  type="text" 
                  value={socials.instagram}
                  onChange={e => setSocials({...socials, instagram: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 focus:outline-none focus:border-primary transition-colors text-brand-text font-bold"
                  placeholder="https://instagram.com/..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-brand-text/40 ml-4 flex items-center gap-2">
                   <Youtube className="w-3 h-3" /> Youtube URL
                </label>
                <input 
                  type="text" 
                  value={socials.youtube}
                  onChange={e => setSocials({...socials, youtube: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 focus:outline-none focus:border-primary transition-colors text-brand-text font-bold"
                  placeholder="https://youtube.com/..."
                />
              </div>
            </div>

            <button 
              disabled={saving}
              className="w-full bg-primary text-brand-bg py-5 rounded-2xl font-black uppercase tracking-widest border-b-4 border-[#FF8C2A] shadow-lg shadow-primary/10 flex items-center justify-center space-x-2"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              <span>{saving ? 'Saving System Data...' : 'Broadcast Changes'}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default AdminSocials;
