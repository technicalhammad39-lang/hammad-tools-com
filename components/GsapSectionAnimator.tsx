'use client';

import { usePathname } from 'next/navigation';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

const PUBLIC_ANIMATED_PATH_PREFIXES = [
  '/',
  '/about',
  '/tools',
  '/services',
  '/blog',
  '/contact',
  '/privacy',
  '/terms',
  '/giveaway',
  '/login',
  '/signup',
  '/forgot-password',
];

let gsapRegistered = false;

function registerGsapPlugins() {
  if (gsapRegistered || typeof window === 'undefined') {
    return;
  }
  gsap.registerPlugin(useGSAP, ScrollTrigger);
  gsapRegistered = true;
}

function shouldAnimatePath(pathname: string) {
  return PUBLIC_ANIMATED_PATH_PREFIXES.some((prefix) => {
    if (prefix === '/') {
      return pathname === '/';
    }
    return pathname === prefix || pathname.startsWith(`${prefix}/`);
  });
}

function isVisibleElement(element: HTMLElement) {
  if (element.hasAttribute('data-gsap-skip')) {
    return false;
  }
  const style = window.getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden') {
    return false;
  }
  return element.getBoundingClientRect().height > 0;
}

function collectAnimationTargets(main: HTMLElement) {
  const explicit = Array.from(main.querySelectorAll<HTMLElement>('[data-gsap-reveal="gsap"]'));

  const uniqueTargets: HTMLElement[] = [];
  const seen = new Set<HTMLElement>();

  for (const candidate of explicit) {
    if (seen.has(candidate)) {
      continue;
    }
    seen.add(candidate);
    if (isVisibleElement(candidate)) {
      uniqueTargets.push(candidate);
    }
  }

  return uniqueTargets;
}

export default function GsapSectionAnimator() {
  const pathname = usePathname();

  useGSAP(
    () => {
      if (!pathname || !shouldAnimatePath(pathname)) {
        return;
      }
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return;
      }

      registerGsapPlugins();

      const main = document.querySelector('main');
      if (!(main instanceof HTMLElement)) {
        return;
      }

      const targets = collectAnimationTargets(main);
      if (!targets.length) {
        return;
      }

      gsap.set(targets, { willChange: 'transform, opacity' });

      targets.forEach((target, index) => {
        gsap.fromTo(
          target,
          { autoAlpha: 0, y: 28 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.65,
            ease: 'power2.out',
            delay: Math.min(index * 0.03, 0.2),
            clearProps: 'willChange',
            scrollTrigger: {
              trigger: target,
              start: 'top 88%',
              once: true,
              fastScrollEnd: true,
            },
          }
        );
      });

      ScrollTrigger.refresh();
    },
    { dependencies: [pathname], revertOnUpdate: true }
  );

  return null;
}
