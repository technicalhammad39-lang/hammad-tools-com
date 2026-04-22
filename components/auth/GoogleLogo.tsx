'use client';

import React from 'react';

export default function GoogleLogo({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.2 1.2-.9 2.1-1.9 2.8l3 2.3c1.8-1.6 2.8-4 2.8-7 0-.7-.1-1.3-.2-2H12z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.9-.9 6.6-2.5l-3-2.3c-.9.6-2.1 1-3.6 1-2.7 0-4.9-1.8-5.7-4.3H3.2v2.4C4.9 19.8 8.2 22 12 22z"
      />
      <path
        fill="#FBBC05"
        d="M6.3 13.9c-.2-.6-.3-1.2-.3-1.9s.1-1.3.3-1.9V7.7H3.2C2.4 9.1 2 10.5 2 12s.4 2.9 1.2 4.3l3.1-2.4z"
      />
      <path
        fill="#4285F4"
        d="M12 5.8c1.5 0 2.9.5 3.9 1.5l2.9-2.9C16.9 2.7 14.7 2 12 2 8.2 2 4.9 4.2 3.2 7.7l3.1 2.4c.8-2.5 3-4.3 5.7-4.3z"
      />
    </svg>
  );
}

