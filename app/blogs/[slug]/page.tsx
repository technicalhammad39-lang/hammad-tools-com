import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { ArrowLeft, CalendarDays, Clock3 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { createPageMetadata, toAbsoluteSiteUrl } from '@/lib/seo';
import {
  extractBlogToc,
  formatBlogPublishDate,
  formatBlogReadTime,
  getBlogReadTimeMinutes,
  slugifyBlogHeading,
} from '@/lib/blog';
import { toMetadataImageUrl } from '@/lib/image-display';
import { getBlogPostBySlug, getPublishedBlogPosts } from '@/lib/server/blog-posts';
import BlogCard from '@/components/blog/BlogCard';
import ShareArticleButton from '@/components/blog/ShareArticleButton';

type PageParams = { slug: string };

function toIsoDate(value: Date | null) {
  if (!value) {
    return new Date().toISOString();
  }
  return value.toISOString();
}

function flattenNodeText(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node.map((entry) => flattenNodeText(entry)).join(' ');
  }

  if (node && typeof node === 'object' && 'props' in node) {
    const childNode = (node as { props?: { children?: ReactNode } }).props?.children;
    return flattenNodeText(childNode || '');
  }

  return '';
}

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);

  if (!post) {
    return createPageMetadata({
      title: 'Blog Not Found',
      description: 'The requested blog post does not exist or is not published.',
      path: `/blogs/${slug}`,
      noIndex: true,
    });
  }

  const metadataImage = toMetadataImageUrl(post.coverImageUrl) || '/services-card.webp';
  return createPageMetadata({
    title: `${post.title} | Hammad Tools Blog`,
    description: post.shortDescription,
    path: `/blogs/${post.slug}`,
    image: metadataImage,
    keywords: ['hammad tools blog', post.title, post.category || 'blog', ...post.tags],
  });
}

export const revalidate = 120;

export default async function BlogDetailPage({ params }: { params: Promise<PageParams> }) {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const coverImageUrl = post.coverImageUrl || '/services-card.webp';
  const publishedAt = post.publishedAt || post.createdAt;
  const publishedLabel = formatBlogPublishDate(publishedAt);
  const readTimeLabel = formatBlogReadTime(getBlogReadTimeMinutes(post.content));
  const articleUrl = toAbsoluteSiteUrl(`/blogs/${post.slug}`);
  const schemaImage = coverImageUrl.startsWith('http')
    ? coverImageUrl
    : toAbsoluteSiteUrl(coverImageUrl);
  const tocItems = extractBlogToc(post.content);
  const hasHeadingToc = tocItems.length > 0;
  const tocIdByLine = new Map<number, string>(tocItems.map((item) => [item.line, item.id]));
  const relatedPosts = (await getPublishedBlogPosts())
    .filter((entry) => entry.id !== post.id)
    .slice(0, 3);

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.shortDescription,
    image: [schemaImage],
    datePublished: toIsoDate(publishedAt),
    dateModified: toIsoDate(post.updatedAt || publishedAt),
    author: {
      '@type': 'Person',
      name: post.authorName || 'Hammad Tools Team',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Hammad Tools',
      logo: {
        '@type': 'ImageObject',
        url: toAbsoluteSiteUrl('/logo-header.png'),
      },
    },
    mainEntityOfPage: articleUrl,
  };

  return (
    <main className="min-h-screen page-navbar-spacing pb-16 md:pb-24 bg-brand-bg">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />

      <div className="site-container">
        <article className="rounded-[1.8rem] md:rounded-[2.2rem] border border-white/10 bg-[#121212]/85 backdrop-blur-sm overflow-hidden shadow-[0_24px_60px_rgba(0,0,0,0.55)]">
          <header className="p-5 sm:p-6 md:p-10 border-b border-white/10">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Link
                href="/blogs"
                className="inline-flex items-center gap-2 text-sm text-brand-text/60 hover:text-primary transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Blog
              </Link>
              <ShareArticleButton url={articleUrl} title={post.title} />
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-primary">
                {post.category || 'Insight'}
              </span>
            </div>

            <h1 className="mt-4 text-3xl sm:text-4xl md:text-6xl leading-tight font-black text-brand-text max-w-5xl">
              {post.title}
            </h1>

            <div className="mt-5 flex flex-wrap items-center gap-4 text-[12px] text-brand-text/65">
              <div className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2">
                <Image
                  src={`https://ui-avatars.com/api/?name=${encodeURIComponent(post.authorName || 'Hammad Tools')}&background=FFD600&color=000000`}
                  alt={post.authorName || 'Author'}
                  width={28}
                  height={28}
                  className="rounded-full"
                />
                <span className="font-semibold">{post.authorName || 'Hammad Tools Team'}</span>
              </div>
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="w-4 h-4 text-primary" />
                {publishedLabel}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock3 className="w-4 h-4 text-primary" />
                {readTimeLabel}
              </span>
            </div>
          </header>

          <div className="relative w-full aspect-[16/8] min-h-[210px] bg-black/45">
            <Image
              src={coverImageUrl}
              alt={post.title}
              fill
              sizes="100vw"
              className="object-cover"
              priority
              unoptimized={coverImageUrl.startsWith('http')}
            />
          </div>
        </article>

        <section className="mt-7 md:mt-10 grid grid-cols-1 lg:grid-cols-[270px_minmax(0,1fr)] gap-6 md:gap-8">
          <aside className="rounded-[1.2rem] md:rounded-[1.4rem] border border-white/10 bg-[#121212]/80 p-5 h-fit lg:sticky lg:top-28">
            <h2 className="text-[11px] font-black uppercase tracking-[0.16em] text-brand-text/60">Table Of Contents</h2>
            {hasHeadingToc ? (
              <nav className="mt-4 space-y-2">
                {tocItems.map((item) => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    className={`block text-sm leading-snug text-brand-text/75 hover:text-primary transition-colors ${
                      item.level === 3 ? 'pl-4 text-[13px]' : 'font-semibold'
                    }`}
                  >
                    {item.text}
                  </a>
                ))}
              </nav>
            ) : (
              <div className="mt-4 space-y-3">
                <a
                  href="#article-overview"
                  className="block text-sm font-semibold leading-snug text-brand-text/75 hover:text-primary transition-colors"
                >
                  Overview
                </a>
                {post.shortDescription ? (
                  <p className="text-[13px] leading-relaxed text-brand-text/55 whitespace-pre-wrap">
                    {post.shortDescription}
                  </p>
                ) : null}
              </div>
            )}
          </aside>

          <article
            id="article-overview"
            className="rounded-[1.2rem] md:rounded-[1.5rem] border border-white/10 bg-[#121212]/75 p-5 sm:p-6 md:p-10"
          >
            <div className="prose prose-invert max-w-none prose-headings:text-brand-text prose-headings:font-black prose-h2:text-2xl md:prose-h2:text-3xl prose-h3:text-xl md:prose-h3:text-2xl prose-p:text-brand-text/80 prose-p:leading-8 prose-p:my-5 prose-li:text-brand-text/80 prose-li:my-1 prose-ul:my-5 prose-ol:my-5 prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-strong:text-brand-text">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h2: ({ children, node }) => {
                    const line = node?.position?.start?.line || 0;
                    const text = flattenNodeText(children);
                    const id = tocIdByLine.get(line) || slugifyBlogHeading(text);
                    return (
                      <h2 id={id} className="scroll-mt-28">
                        {children}
                      </h2>
                    );
                  },
                  h3: ({ children, node }) => {
                    const line = node?.position?.start?.line || 0;
                    const text = flattenNodeText(children);
                    const id = tocIdByLine.get(line) || slugifyBlogHeading(text);
                    return (
                      <h3 id={id} className="scroll-mt-28">
                        {children}
                      </h3>
                    );
                  },
                  p: ({ children }) => (
                    <p className="whitespace-pre-wrap leading-8 text-brand-text/80">{children}</p>
                  ),
                  a: ({ href, children, ...props }) => {
                    const safeHref = href || '#';
                    const isExternal = /^https?:\/\//i.test(safeHref);
                    return (
                      <a
                        href={safeHref}
                        target={isExternal ? '_blank' : undefined}
                        rel={isExternal ? 'noopener noreferrer' : undefined}
                        {...props}
                      >
                        {children}
                      </a>
                    );
                  },
                }}
              >
                {post.content}
              </ReactMarkdown>
            </div>
          </article>
        </section>

        <section className="mt-10 md:mt-14 rounded-[1.5rem] border border-white/10 bg-gradient-to-r from-[#141414] via-[#1A1A1A] to-[#151515] p-6 md:p-9 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-brand-text">Build Your Next Premium Stack</h2>
            <p className="mt-2 text-brand-text/60">
              Explore tools or start your project with our managed services.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/tools"
              className="inline-flex items-center justify-center rounded-xl border border-primary/30 bg-primary px-5 py-3 text-[11px] font-black uppercase tracking-[0.12em] text-black"
            >
              Explore Tools
            </Link>
            <Link
              href="/services"
              className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/[0.04] px-5 py-3 text-[11px] font-black uppercase tracking-[0.12em] text-brand-text"
            >
              Start Project
            </Link>
          </div>
        </section>

        {relatedPosts.length ? (
          <section className="mt-10 md:mt-14">
            <h2 className="text-2xl md:text-3xl font-black text-brand-text mb-5 md:mb-7">Related Articles</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 md:gap-8">
              {relatedPosts.map((related) => (
                <BlogCard key={related.id} post={related} compact />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
