'use client';

import { useEffect, useState } from 'react';
import { ChevronUp } from 'lucide-react';

type LenisScroller = {
  scrollTo: (target: number | string | HTMLElement, options?: { duration?: number }) => void;
};

export default function BackToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > 420);
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={() => {
        const lenis = (window as Window & { __lenis?: LenisScroller }).__lenis;
        if (lenis) {
          lenis.scrollTo(0, { duration: 1.05 });
          return;
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }}
      className="fixed right-3 sm:right-4 bottom-4 sm:bottom-6 z-[110] w-10 h-10 sm:w-11 sm:h-11 rounded-full border border-[#FFEA00] bg-primary text-black shadow-[0_10px_24px_rgba(255,214,0,0.35)] hover:bg-[#FFEA00] hover:shadow-[0_10px_24px_rgba(255,214,0,0.5)] transition-colors"
      aria-label="Back to top"
      title="Back to top"
    >
      <ChevronUp className="w-5 h-5 mx-auto" />
    </button>
  );
}
