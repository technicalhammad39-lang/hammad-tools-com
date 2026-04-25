import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, CalendarDays } from 'lucide-react';
import { createPageMetadata } from '@/lib/seo';
import { formatBlogPublishDate } from '@/lib/blog';
import { getPublishedBlogPosts } from '@/lib/server/blog-posts';

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
            {posts.map((post) => {
              const coverImageUrl = post.coverImageUrl || '/services-card.webp';
              const publishDate = formatBlogPublishDate(post.publishedAt || post.createdAt);
              return (
                <article
                  key={post.id}
                  className="group rounded-[2rem] overflow-hidden border border-white/10 bg-black/30 backdrop-blur-md h-full flex flex-col"
                >
                  <Link href={`/blogs/${post.slug}`} className="block" aria-label={`Read ${post.title}`}>
                    <div className="relative aspect-[16/10] overflow-hidden bg-black/40">
                      <Image
                        src={coverImageUrl}
                        alt={post.title}
                        fill
                        sizes="(max-width: 767px) 100vw, (max-width: 1279px) 50vw, 33vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        unoptimized={coverImageUrl.startsWith('http')}
                      />
                    </div>
                  </Link>

                  <div className="p-6 md:p-7 flex-1 flex flex-col">
                    <div className="flex items-center text-[11px] text-brand-text/45 gap-2 font-semibold uppercase tracking-wide">
                      <CalendarDays className="w-4 h-4 text-primary" />
                      <span>{publishDate}</span>
                    </div>

                    <h2 className="mt-4 text-xl md:text-2xl font-black text-brand-text leading-tight group-hover:text-primary transition-colors">
                      <Link href={`/blogs/${post.slug}`}>{post.title}</Link>
                    </h2>

                    <p className="mt-3 text-sm md:text-[15px] text-brand-text/60 leading-relaxed line-clamp-3">
                      {post.shortDescription}
                    </p>

                    <div className="mt-6">
                      <Link
                        href={`/blogs/${post.slug}`}
                        className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2.5 text-[11px] font-black uppercase tracking-widest text-brand-text hover:border-primary/35 hover:text-primary transition-colors"
                      >
                        Read More
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
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
