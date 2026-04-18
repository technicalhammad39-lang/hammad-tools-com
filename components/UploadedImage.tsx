'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ImgHTMLAttributes } from 'react';
import { normalizeImageUrl } from '@/lib/image-display';

type UploadedImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  src: string;
  fallbackSrc?: string;
};

function resolvePreferredSource(value: string, fallback: string) {
  return normalizeImageUrl(value) || fallback;
}

export default function UploadedImage({
  src,
  fallbackSrc = '/services-card.png',
  alt,
  className,
  loading,
  decoding,
  ...rest
}: UploadedImageProps) {
  const normalizedFallback = useMemo(() => normalizeImageUrl(fallbackSrc) || '/services-card.png', [fallbackSrc]);
  const preferred = useMemo(
    () => resolvePreferredSource(src, normalizedFallback),
    [src, normalizedFallback]
  );

  const [currentSrc, setCurrentSrc] = useState(preferred);

  useEffect(() => {
    setCurrentSrc(preferred);
  }, [preferred]);

  return (
    <img
      src={currentSrc}
      alt={alt}
      className={className}
      loading={loading || 'lazy'}
      decoding={decoding || 'async'}
      onError={() => {
        if (currentSrc !== normalizedFallback) {
          setCurrentSrc(normalizedFallback);
        }
      }}
      {...rest}
    />
  );
}
