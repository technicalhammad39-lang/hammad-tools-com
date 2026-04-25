'use client';

import { useState } from 'react';
import { Check, Share2 } from 'lucide-react';
import { useToast } from '@/components/ToastProvider';

type ShareArticleButtonProps = {
  url: string;
  title: string;
  className?: string;
};

export default function ShareArticleButton({ url, title, className = '' }: ShareArticleButtonProps) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        await navigator.share({ title, url });
        return;
      }

      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('Copied', 'Article link copied to clipboard');
      window.setTimeout(() => setCopied(false), 1400);
    } catch (error) {
      console.error('Share failed:', error);
      toast.error('Share failed', 'Could not copy or share this article.');
    }
  }

  return (
    <button
      type="button"
      onClick={() => {
        void handleShare();
      }}
      className={`inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.12em] text-brand-text/80 hover:text-primary hover:border-primary/35 transition-colors ${className}`}
    >
      {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
      {copied ? 'Copied' : 'Share'}
    </button>
  );
}
