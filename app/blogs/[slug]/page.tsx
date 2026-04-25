import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { ArrowLeft, CalendarDays, Tag } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { createPageMetadata, toAbsoluteSiteUrl } from '@/lib/seo';
import { formatBlogPublishDate } from '@/lib/blog';
import { toMetadataImageUrl } from '@/lib/image-display';
import { getBlogPostBySlug } from '@/lib/server/blog-posts';

type PageParams = { slug: string };

function toIsoDate(value: Date | null) {
  if (!value) {
    return new Date().toISOString();
  }
  return value.toISOString();
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
  const articleUrl = toAbsoluteSiteUrl(`/blogs/${post.slug}`);
  const schemaImage = coverImageUrl.startsWith('http')
    ? coverImageUrl
    : toAbsoluteSiteUrl(coverImageUrl);

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

      <div className="site-container-readable">
        <Link
          href="/blogs"
          className="inline-flex items-center gap-2 text-sm text-brand-text/60 hover:text-primary transition-colors mb-7"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Blogs
        </Link>

        <article className="rounded-[2rem] border border-white/10 bg-black/30 backdrop-blur-sm overflow-hidden">
          <header className="p-6 md:p-10 border-b border-white/10">
            <div className="flex flex-wrap items-center gap-3 text-[11px] uppercase tracking-wider font-semibold text-brand-text/55">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="w-4 h-4 text-primary" />
                {publishedLabel}
              </span>
              {post.category ? (
                <span className="px-2.5 py-1 rounded-md bg-primary/10 border border-primary/20 text-primary">
                  {post.category}
                </span>
              ) : null}
            </div>

            <h1 className="mt-4 text-3xl md:text-5xl leading-tight font-black text-brand-text">
              {post.title}
            </h1>
            <p className="mt-4 text-brand-text/65 max-w-4xl">{post.shortDescription}</p>
          </header>

          <div className="relative w-full aspect-[16/8] bg-black/40">
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

          <div className="p-6 md:p-10 lg:p-12">
            <div
              className="prose prose-invert max-w-none prose-headings:text-brand-text prose-headings:font-black prose-p:text-brand-text/80 prose-p:leading-relaxed prose-li:text-brand-text/80 prose-a:text-primary prose-a:underline hover:prose-a:text-primary/80"
            >
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
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

            {post.tags.length ? (
              <div className="mt-10 pt-6 border-t border-white/10 flex flex-wrap gap-2.5">
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] uppercase tracking-wide font-semibold border border-white/10 text-brand-text/70"
                  >
                    <Tag className="w-3.5 h-3.5 text-primary" />
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </article>
      </div>
    </main>
  );
}
