import type { Metadata } from 'next';
import { createPageMetadata } from '@/lib/seo';
import { getPublishedBlogPosts } from '@/lib/server/blog-posts';
import BlogCard from '@/components/blog/BlogCard';

export const metadata: Metadata = createPageMetadata({
  title: 'Blogs - Guides, Updates & Subscription Insights',
  description:
    'Explore practical guides, tool tutorials, and subscription insights from Hammad Tools.',
  path: '/blogs',
  keywords: ['hammad tools blog', 'subscription guides', 'digital tool tutorials', 'productivity tips'],
});

export const revalidate = 120;

export default async function BlogsPage() {
  const posts = await getPublishedBlogPosts();

  return (
    <main className="min-h-screen page-navbar-spacing pb-16 md:pb-24 bg-brand-bg">
      <div className="site-container">
        <header className="text-center mb-10 md:mb-14">
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-black uppercase leading-none text-brand-text">
            <span className="font-serif italic text-white normal-case">Latest</span>{' '}
            <span className="internal-gradient">Blogs</span>
          </h1>
          <p className="mt-4 text-sm md:text-base text-brand-text/60 max-w-3xl mx-auto">
            Actionable posts on tools, workflows, and premium subscription strategies.
          </p>
        </header>

        {posts.length ? (
          <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 md:gap-8">
            {posts.map((post) => (
              <BlogCard key={post.id} post={post} />
            ))}
          </section>
        ) : (
          <section className="rounded-[2rem] border border-white/10 bg-black/25 p-10 text-center">
            <h2 className="text-2xl md:text-3xl font-black text-brand-text uppercase">No Blogs Yet</h2>
            <p className="mt-3 text-brand-text/55">
              Published posts will appear here once the admin publishes them.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
