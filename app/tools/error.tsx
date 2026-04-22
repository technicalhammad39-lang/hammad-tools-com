'use client';

import Link from 'next/link';

export default function ToolsError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="min-h-screen pt-20 pb-20 px-4 bg-brand-bg">
      <div className="max-w-3xl mx-auto glass rounded-2xl border border-white/10 p-8 text-center">
        <h1 className="text-2xl md:text-3xl font-black uppercase text-brand-text">Tools Unavailable</h1>
        <p className="text-brand-text/45 text-xs md:text-sm mt-3">
          We could not load tools right now. Please retry.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            onClick={() => reset()}
            className="bg-primary text-black px-5 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] border-b-4 border-secondary"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="bg-white/5 border border-white/10 text-brand-text px-5 py-3 rounded-xl font-black uppercase tracking-widest text-[10px]"
          >
            Home
          </Link>
        </div>
      </div>
    </main>
  );
}

