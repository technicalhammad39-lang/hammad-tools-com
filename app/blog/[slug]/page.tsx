import type { Metadata } from 'next';
import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import { db } from '@/firebase';
import BlogDetailClient from './BlogDetailClient';
import { resolveImageSource, toMetadataImageUrl } from '@/lib/image-display';
import type { StoredFileMetadata } from '@/lib/types/domain';
import { createPageMetadata, toAbsoluteSiteUrl } from '@/lib/seo';

interface BlogPost {
  id: string;
  title: string;
  content: string;
  slug?: string;
  thumbnail?: string;
  thumbnailMedia?: StoredFileMetadata | null;
  author: string;
  createdAt: any;
  updatedAt?: any;
  category: string;
  tags: string[];
}

function slugify(value: string) {
  return (value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function toShortDescription(post: BlogPost) {
  const raw = (post.content || '').replace(/\s+/g, ' ').trim();
  if (!raw) {
    return `${post.title} by Hammad Tools.`;
  }
  return raw.slice(0, 170);
}

function getPostSlug(post: BlogPost, fallback: string) {
  const explicit = (post.slug || '').trim().toLowerCase();
  if (explicit) {
    return explicit;
  }
  return slugify(post.title || '') || (fallback || '').trim().toLowerCase();
}

function toIsoDate(value: any, fallback = '1970-01-01T00:00:00.000Z') {
  const candidate = value?.toDate?.() || value;
  if (!candidate) {
    return fallback;
  }
  const parsed = candidate instanceof Date ? candidate : new Date(candidate);
  if (Number.isNaN(parsed.getTime())) {
    return fallback;
  }
  return parsed.toISOString();
}

async function getPost(slug: string): Promise<BlogPost | null> {
  try {
    const normalizedSlug = decodeURIComponent(slug).toLowerCase().trim();

    const q = query(
      collection(db, 'blogPosts'),
      where('published', '==', true),
      where('slug', '==', normalizedSlug),
      limit(1)
    );
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() } as BlogPost;
    }

    const rawQ = query(
      collection(db, 'blogPosts'),
      where('published', '==', true),
      where('slug', '==', slug),
      limit(1)
    );
    const rawSnapshot = await getDocs(rawQ);
    if (!rawSnapshot.empty) {
      const doc = rawSnapshot.docs[0];
      return { id: doc.id, ...doc.data() } as BlogPost;
    }

    const fallbackSnapshot = await getDocs(
      query(collection(db, 'blogPosts'), where('published', '==', true))
    );
    const fallbackDoc = fallbackSnapshot.docs.find((entry) => {
      const data = entry.data() as Partial<BlogPost>;
      return slugify(String(data.title || '')) === normalizedSlug;
    });

    if (fallbackDoc) {
      return { id: fallbackDoc.id, ...fallbackDoc.data() } as BlogPost;
    }

    return null;
  } catch (error) {
    console.error('Error fetching post:', error);
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post) {
    return createPageMetadata({
      title: 'Post Not Found',
      description: 'The requested blog post could not be found.',
      path: `/blog/${slug}`,
    });
  }

  const thumbnailSrc = resolveImageSource(post, {
    mediaPaths: ['thumbnailMedia'],
    stringPaths: ['thumbnail'],
  });
  const metadataImage = toMetadataImageUrl(thumbnailSrc) || '/services-card.png';

  return createPageMetadata({
    title: `${post.title} | Hammad Tools Blog`,
    description: toShortDescription(post),
    path: `/blog/${getPostSlug(post, slug)}`,
    image: metadataImage,
    keywords: [
      'hammad tools blog',
      post.title,
      post.category || 'blog',
      ...(Array.isArray(post.tags) ? post.tags : []),
      'paid services by hammad',
      'cheap subscriptions Pakistan',
    ],
  });
}

export default async function BlogPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post) {
    return <BlogDetailClient post={null} loading={false} />;
  }

  const postSlug = getPostSlug(post, slug);
  const thumbnailSrc = resolveImageSource(post, {
    mediaPaths: ['thumbnailMedia'],
    stringPaths: ['thumbnail'],
    placeholder: '/services-card.png',
  });
  const imageUrl = thumbnailSrc.startsWith('http') ? thumbnailSrc : toAbsoluteSiteUrl(thumbnailSrc);
  const articleUrl = toAbsoluteSiteUrl(`/blog/${postSlug}`);

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: toShortDescription(post),
    image: [imageUrl],
    datePublished: toIsoDate(post.createdAt),
    dateModified: toIsoDate(post.updatedAt || post.createdAt),
    author: {
      '@type': 'Person',
      name: post.author || 'Hammad Tools Team',
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
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <BlogDetailClient post={post} loading={false} />
    </>
  );
}
