import Link from 'next/link';

export default function BlogNotFound() {
  return (
    <main className="min-h-screen page-navbar-spacing flex items-center justify-center bg-brand-bg px-4">
      <div className="max-w-xl w-full text-center rounded-[2rem] border border-white/10 bg-black/35 p-8 md:p-10">
        <h1 className="text-3xl md:text-4xl font-black text-brand-text uppercase">Blog Not Found</h1>
        <p className="mt-3 text-brand-text/60">
          The article you are looking for is unavailable or not published.
        </p>
        <Link
          href="/blogs"
          className="mt-6 inline-flex items-center justify-center rounded-xl border border-primary/35 bg-primary px-5 py-3 text-[11px] font-black uppercase tracking-widest text-black"
        >
          Browse Blogs
        </Link>
      </div>
    </main>
  );
}
