'use client';

export default function AboutError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="min-h-screen page-navbar-spacing pb-20 px-4 bg-brand-bg">
      <div className="max-w-3xl mx-auto glass rounded-2xl border border-white/10 p-8 text-center">
        <h1 className="text-2xl md:text-3xl font-black uppercase text-brand-text">About Page Unavailable</h1>
        <p className="text-brand-text/45 text-xs md:text-sm mt-3">
          Please retry loading this page.
        </p>
        <button
          onClick={() => reset()}
          className="mt-6 bg-primary text-black px-5 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] border-b-4 border-secondary"
        >
          Try Again
        </button>
      </div>
    </main>
  );
}

