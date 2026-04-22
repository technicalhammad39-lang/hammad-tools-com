'use client';

import { RefObject, useEffect } from 'react';

export function useGsapReveal(containerRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    let ctx: { revert: () => void } | null = null;
    let active = true;

    (async () => {
      const gsapModule = await import('gsap');
      const scrollTriggerModule = await import('gsap/ScrollTrigger');
      if (!active || !containerRef.current) {
        return;
      }

      const gsap = gsapModule.gsap;
      const ScrollTrigger = scrollTriggerModule.ScrollTrigger;
      gsap.registerPlugin(ScrollTrigger);

      ctx = gsap.context(() => {
        const targets = Array.from(container.querySelectorAll<HTMLElement>('[data-gsap-reveal]'));
        targets.forEach((target, index) => {
          gsap.fromTo(
            target,
            { autoAlpha: 0, y: 24 },
            {
              autoAlpha: 1,
              y: 0,
              duration: 0.55,
              ease: 'power2.out',
              delay: Math.min(index * 0.04, 0.24),
              scrollTrigger: {
                trigger: target,
                start: 'top 88%',
                once: true,
              },
            }
          );
        });
      }, container);
    })();

    return () => {
      active = false;
      if (ctx) {
        ctx.revert();
      }
    };
  }, [containerRef]);
}

