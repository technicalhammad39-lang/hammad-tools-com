'use client';

import React, { useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';
import { motion } from 'motion/react';

type SnowParticleConfig = {
  leftPercent: number;
  scale: number;
  driftPx: number;
  duration: number;
  delay: number;
};

const SNOW_PARTICLE_COUNT = 50;

function seededRandom(seed: number) {
  const x = Math.sin(seed * 9999.17) * 10000;
  return x - Math.floor(x);
}

const SNOW_PARTICLES: SnowParticleConfig[] = Array.from(
  { length: SNOW_PARTICLE_COUNT },
  (_, index) => {
    const base = index + 1;
    return {
      leftPercent: seededRandom(base * 3.11) * 100,
      scale: seededRandom(base * 2.73) * 0.3 + 0.2,
      driftPx: (seededRandom(base * 4.29) - 0.5) * 180,
      duration: seededRandom(base * 5.07) * 10 + 10,
      delay: seededRandom(base * 7.13) * 20,
    };
  }
);

const subscribe = () => () => {};

function useHydrated() {
  return useSyncExternalStore(subscribe, () => true, () => false);
}

const AnimatedBackground = () => {
  const pathname = usePathname();
  const isHydrated = useHydrated();
  const showParticles = ['/', '/about', '/services', '/blogs', '/giveaway'].includes(pathname);

  return (
    <div className="fixed inset-0 -z-50 overflow-hidden pointer-events-none bg-[#0A0A0A]">
      {/* 3D-like Glowing Orbs */}
      <motion.div
        animate={{
          x: [0, 100, 0],
          y: [0, 50, 0],
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#FFD600]/5 rounded-full blur-[120px]"
      />
      <motion.div
        animate={{
          x: [0, -80, 0],
          y: [0, 120, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2,
        }}
        className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-[#FF8C2A]/5 rounded-full blur-[150px]"
      />

      {/* Snowfall/Particle Animation - Only render on specific routes */}
      {isHydrated && showParticles && (
        <div className="absolute inset-0 pointer-events-none">
          {SNOW_PARTICLES.map((particle, i) => (
            <motion.div
              key={`snow-${i}`}
              initial={{ 
                opacity: 0, 
                y: -20,
                x: 0,
                scale: particle.scale,
              }}
              animate={{
                opacity: [0, 0.4, 0],
                y: ["0%", "100%"],
                x: [0, particle.driftPx],
              }}
              transition={{
                duration: particle.duration,
                repeat: Infinity,
                ease: "linear",
                delay: particle.delay,
              }}
              className="absolute w-1 h-1 bg-white rounded-full blur-[1px]"
              style={{
                left: `${particle.leftPercent}%`,
              }}
            />
          ))}
        </div>
      )}

      {/* Grainy Texture Overlay */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 contrast-150 brightness-50" />
    </div>
  );
};

export default AnimatedBackground;
