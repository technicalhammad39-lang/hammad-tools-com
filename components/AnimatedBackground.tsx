'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { motion } from 'motion/react';

const AnimatedBackground = () => {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
      {mounted && ['/', '/about', '/services', '/blog', '/giveaway'].includes(pathname) && (
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(50)].map((_, i) => (
            <motion.div
              key={`snow-${i}`}
              initial={{ 
                opacity: 0, 
                x: Math.random() * 100 + "%", 
                y: -20,
                scale: Math.random() * 0.3 + 0.2,
              }}
              animate={{
                opacity: [0, 0.4, 0],
                y: ["0%", "100%"],
                x: (Math.random() - 0.5) * 20 + "%", // Settle drift
              }}
              transition={{
                duration: Math.random() * 10 + 10,
                repeat: Infinity,
                ease: "linear",
                delay: Math.random() * 20,
              }}
              className="absolute w-1 h-1 bg-white rounded-full blur-[1px]"
              style={{
                left: `${Math.random() * 100}%`,
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
