'use client';

import { useEffect, useMemo, useRef } from 'react';
import { usePathname } from 'next/navigation';
import Lenis from 'lenis';

const LENIS_PUBLIC_PREFIXES = ['/', '/tools', '/services', '/about', '/blog', '/contact', '/privacy', '/terms', '/giveaway'];

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

function hasNestedScrollableAncestor(node: HTMLElement) {
  let current: HTMLElement | null = node;

  while (current && current !== document.body && current !== document.documentElement) {
    const styles = window.getComputedStyle(current);
    const canScrollY = /(auto|scroll|overlay)/.test(styles.overflowY) && current.scrollHeight > current.clientHeight + 1;
    const canScrollX = /(auto|scroll|overlay)/.test(styles.overflowX) && current.scrollWidth > current.clientWidth + 1;

    if (canScrollY || canScrollX) {
      return true;
    }

    current = current.parentElement;
  }

  return false;
}

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

    const lenis = new Lenis({
      autoRaf: true,
      smoothWheel: true,
      anchors: true,
      stopInertiaOnNavigate: true,
      allowNestedScroll: true,
      syncTouch: false,
      lerp: 0.09,
      wheelMultiplier: 0.95,
      touchMultiplier: 1,
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

        return hasNestedScrollableAncestor(node);
      },
    });

    lenisRef.current = lenis;

    return () => {
      lenis.destroy();
      if (lenisRef.current === lenis) {
        lenisRef.current = null;
      }
      clearLenisClasses();
    };
  }, [enableLenis]);

  return null;
}

