'use client';

import { useEffect, useMemo, useRef } from 'react';
import { usePathname } from 'next/navigation';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const LENIS_PUBLIC_PREFIXES = [
  '/',
  '/tools',
  '/services',
  '/about',
  '/blog',
  '/contact',
  '/privacy',
  '/terms',
  '/giveaway',
  '/checkout',
  '/login',
  '/signup',
  '/forgot-password',
  '/dashboard',
  '/profile',
];

function isPublicLenisRoute(pathname: string) {
  return LENIS_PUBLIC_PREFIXES.some((prefix) => {
    if (prefix === '/') {
      return pathname === '/';
    }
    return pathname === prefix || pathname.startsWith(`${prefix}/`);
  });
}

function clearLenisClasses() {
  document.documentElement.classList.remove('lenis', 'lenis-smooth', 'lenis-stopped', 'lenis-scrolling');
  document.body.classList.remove('lenis', 'lenis-smooth', 'lenis-stopped', 'lenis-scrolling');
}

type LenisWindow = Window & { __lenis?: Lenis };

export default function LenisProvider() {
  const pathname = usePathname();
  const lenisRef = useRef<Lenis | null>(null);

  const enableLenis = useMemo(() => {
    if (!pathname) {
      return false;
    }
    return isPublicLenisRoute(pathname);
  }, [pathname]);

  useEffect(() => {
    if (!enableLenis || typeof window === 'undefined') {
      if (lenisRef.current) {
        lenisRef.current.destroy();
        lenisRef.current = null;
      }
      if (typeof document !== 'undefined') {
        clearLenisClasses();
      }
      return;
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      clearLenisClasses();
      return;
    }
    if (window.matchMedia('(max-width: 767px)').matches) {
      clearLenisClasses();
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    const lenis = new Lenis({
      autoRaf: false,
      smoothWheel: true,
      anchors: true,
      stopInertiaOnNavigate: true,
      allowNestedScroll: true,
      syncTouch: true,
      duration: 1.6,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      wheelMultiplier: 1.08,
      touchMultiplier: 1.25,
      prevent: (node) => {
        if (!(node instanceof HTMLElement)) {
          return false;
        }

        if (
          node.closest(
            '[data-lenis-prevent], [data-lenis-prevent-wheel], [data-lenis-prevent-touch], [role="dialog"], [aria-modal="true"], [data-scroll-locked]'
          )
        ) {
          return true;
        }
        return false;
      },
    });

    lenisRef.current = lenis;
    (window as LenisWindow).__lenis = lenis;

    const onLenisScroll = () => ScrollTrigger.update();
    lenis.on('scroll', onLenisScroll);

    let rafId = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      rafId = window.requestAnimationFrame(raf);
    };
    rafId = window.requestAnimationFrame(raf);

    return () => {
      if (rafId) {
        window.cancelAnimationFrame(rafId);
      }
      lenis.off('scroll', onLenisScroll);
      lenis.destroy();
      if (lenisRef.current === lenis) {
        lenisRef.current = null;
      }
      const lenisWindow = window as LenisWindow;
      if (lenisWindow.__lenis === lenis) {
        delete lenisWindow.__lenis;
      }
      clearLenisClasses();
    };
  }, [enableLenis]);

  return null;
}
