import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CalendarDays, ChevronRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  buildSeoDescription,
  createAutoPageMetadata,
  createPageMetadata,
  toAbsoluteSiteUrl,
} from '@/lib/seo';
import {
  formatBlogPublishDate,
} from '@/lib/blog';
import { toMetadataImageUrl } from '@/lib/image-display';
import { getBlogPostBySlug, getPublishedBlogPosts } from '@/lib/server/blog-posts';
import { adminDb } from '@/lib/server/firebase-admin';
import BlogCard from '@/components/blog/BlogCard';
import UploadedImage from '@/components/UploadedImage';
import {
  buildBlogRelValue,
  isExternalBlogHref,
  parseBlogLinkMeta,
  sanitizeBlogHref,
} from '@/lib/blog-links';

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
  const baseMetadata = createAutoPageMetadata({
    title: `${post.title} | Hammad Tools Blog`,
    path: `/blogs/${post.slug}`,
    image: metadataImage,
    shortDescription: post.shortDescription,
    content: post.content,
    fallbackDescription: `${post.title} - practical guide from Hammad Tools.`,
    keywords: ['hammad tools blog', post.title, post.category || 'blog', ...post.tags],
  });

  return {
    ...baseMetadata,
    openGraph: {
      ...(baseMetadata.openGraph || {}),
      type: 'article',
      publishedTime: toIsoDate(post.publishedAt || post.createdAt),
      modifiedTime: toIsoDate(post.updatedAt || post.publishedAt || post.createdAt),
    },
  };
}

export const revalidate = 120;

const BLOG_MARKDOWN_ALLOWED_ELEMENTS = [
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'p',
  'a',
  'strong',
  'em',
  'ul',
  'ol',
  'li',
  'blockquote',
  'code',
  'pre',
  'hr',
  'br',
];

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
  const relatedPosts = (await getPublishedBlogPosts())
    .filter((entry) => entry.id !== post.id)
    .slice(0, 3);
  let authorDisplayName = post.authorName || 'Hammad 4 technical';
  let authorPhotoUrl = '';

  if (post.authorId) {
    try {
      const authorSnap = await adminDb.collection('users').doc(post.authorId).get();
      if (authorSnap.exists) {
        const authorData = authorSnap.data() as Record<string, unknown>;
        const fromProfileName =
          typeof authorData.displayName === 'string' ? authorData.displayName.trim() : '';
        const fromProfilePhoto =
          typeof authorData.photoURL === 'string' ? authorData.photoURL.trim() : '';
        authorDisplayName = fromProfileName || authorDisplayName;
        authorPhotoUrl = fromProfilePhoto || authorPhotoUrl;
      }
    } catch (error) {
      console.error('Failed to resolve blog author profile:', error);
    }
  }

  if (!authorDisplayName) {
    authorDisplayName = 'Hammad 4 technical';
  }

  if (!authorPhotoUrl) {
    authorPhotoUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(authorDisplayName)}&background=FFD600&color=000000`;
  }

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: buildSeoDescription(
      [post.shortDescription, post.content],
      `${post.title} - Hammad Tools blog post.`,
      200
    ),
    image: [schemaImage],
    datePublished: toIsoDate(publishedAt),
    dateModified: toIsoDate(post.updatedAt || publishedAt),
    articleBody: post.content,
    author: {
      '@type': 'Person',
      name: authorDisplayName,
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
    articleSection: post.category || 'Blog',
    keywords: post.tags,
  };

  return (
    <main className="min-h-screen page-navbar-spacing pb-16 md:pb-24 bg-brand-bg">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />

      <div className="site-container-readable">
        <header className="mb-5 md:mb-8">
          <nav className="mb-3 flex flex-wrap items-center gap-2 text-[11px] text-brand-text/45">
            <Link href="/" className="hover:text-primary transition-colors">
              Home
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-brand-text/35" />
            <Link href="/blogs" className="hover:text-primary transition-colors">
              Blog
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-brand-text/35" />
            <span className="text-brand-text/65">{post.title}</span>
          </nav>

          <article className="p-0 sm:p-1 md:p-2">
            <h1 className="mt-1 text-center text-3xl sm:text-4xl md:text-6xl leading-[1.04] font-black text-brand-text tracking-[-0.02em]">
              {post.title}
            </h1>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-[12px] text-brand-text/65">
              <div className="inline-flex items-center gap-2">
                <UploadedImage
                  src={authorPhotoUrl}
                  alt={authorDisplayName}
                  fallbackSrc={null}
                  fallbackOnError={false}
                  className="w-[30px] h-[30px] rounded-full object-cover"
                />
                <span className="font-semibold">{authorDisplayName}</span>
              </div>
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="w-4 h-4 text-primary" />
                {publishedLabel}
              </span>
            </div>

            {post.shortDescription ? (
              <div className="mt-4 text-center text-base md:text-lg leading-relaxed text-brand-text/72 max-w-4xl mx-auto">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  skipHtml
                  allowedElements={BLOG_MARKDOWN_ALLOWED_ELEMENTS}
                  components={{
                    p: ({ children }) => (
                      <p className="whitespace-pre-wrap leading-relaxed text-brand-text/72 my-2">
                        {children}
                      </p>
                    ),
                    a: ({ href, title, children, ...props }) => {
                      const safeHref = sanitizeBlogHref(href);
                      const linkMeta = parseBlogLinkMeta(title);
                      const external = isExternalBlogHref(safeHref);
                      const openInNewTab = external || linkMeta.openInNewTab;
                      const rel = buildBlogRelValue({
                        external,
                        nofollow: linkMeta.nofollow,
                        openInNewTab,
                      });

                      return (
                        <a
                          href={safeHref}
                          title={linkMeta.title}
                          target={openInNewTab ? '_blank' : undefined}
                          rel={rel}
                          className="text-primary underline underline-offset-4"
                          {...props}
                        >
                          {children}
                        </a>
                      );
                    },
                  }}
                >
                  {post.shortDescription}
                </ReactMarkdown>
              </div>
            ) : null}
          </article>
        </header>

        <section className="relative w-full overflow-hidden rounded-[1rem] md:rounded-[1.35rem] border border-white/10 bg-black/35">
          <UploadedImage
            src={coverImageUrl}
            alt={post.title}
            fallbackSrc="/services-card.webp"
            className="w-full h-auto object-contain"
          />
        </section>

        <section className="mt-8 md:mt-10 p-0 sm:p-1 md:p-2">
          <div className="prose prose-invert max-w-none prose-headings:text-brand-text prose-headings:font-black prose-h2:text-2xl md:prose-h2:text-3xl prose-h2:mt-10 prose-h2:mb-4 prose-h3:text-xl md:prose-h3:text-2xl prose-h3:mt-8 prose-h3:mb-3 prose-p:text-brand-text/82 prose-p:leading-8 prose-p:my-5 prose-li:text-brand-text/80 prose-li:leading-8 prose-li:my-1 prose-ul:my-5 prose-ol:my-5 prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-strong:text-brand-text">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              skipHtml
              allowedElements={BLOG_MARKDOWN_ALLOWED_ELEMENTS}
              components={{
                p: ({ children }) => (
                  <p className="whitespace-pre-wrap leading-8 text-brand-text/82">{children}</p>
                ),
                a: ({ href, title, children, ...props }) => {
                  const safeHref = sanitizeBlogHref(href);
                  const linkMeta = parseBlogLinkMeta(title);
                  const external = isExternalBlogHref(safeHref);
                  const openInNewTab = external || linkMeta.openInNewTab;
                  const rel = buildBlogRelValue({
                    external,
                    nofollow: linkMeta.nofollow,
                    openInNewTab,
                  });

                  return (
                    <a
                      href={safeHref}
                      title={linkMeta.title}
                      target={openInNewTab ? '_blank' : undefined}
                      rel={rel}
                      className="text-primary underline-offset-4"
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
        </section>

        {relatedPosts.length ? (
          <section className="mt-10 md:mt-14">
            <h2 className="text-2xl md:text-3xl font-black text-brand-text mb-5 md:mb-7 tracking-[-0.015em]">
              Related Articles
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 md:gap-6">
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
