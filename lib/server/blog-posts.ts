import { adminDb } from '@/lib/server/firebase-admin';
import {
  blogSortTimestamp,
  isBlogPostPublished,
  normalizeBlogPostDocument,
  normalizeBlogSlug,
  type BlogPostDocument,
} from '@/lib/blog';

function sortNewestFirst(posts: BlogPostDocument[]) {
  return [...posts].sort((a, b) => blogSortTimestamp(b) - blogSortTimestamp(a));
}

async function getPublishedByStatus() {
  const snapshot = await adminDb.collection('blogPosts').where('status', '==', 'published').get();
  return snapshot.docs.map((doc) => normalizeBlogPostDocument(doc.data(), doc.id));
}

async function getPublishedByLegacyFlag() {
  const snapshot = await adminDb.collection('blogPosts').where('published', '==', true).get();
  return snapshot.docs.map((doc) => normalizeBlogPostDocument(doc.data(), doc.id));
}

export async function getPublishedBlogPosts(): Promise<BlogPostDocument[]> {
  try {
    const [statusPublished, legacyPublished] = await Promise.all([
      getPublishedByStatus().catch(() => []),
      getPublishedByLegacyFlag().catch(() => []),
    ]);

    const merged = new Map<string, BlogPostDocument>();
    for (const post of [...statusPublished, ...legacyPublished]) {
      if (isBlogPostPublished(post)) {
        merged.set(post.id, post);
      }
    }
    return sortNewestFirst(Array.from(merged.values()));
  } catch (error) {
    console.error('Failed to fetch published blog posts:', error);
    return [];
  }
}

export async function getBlogPostBySlug(slug: string): Promise<BlogPostDocument | null> {
  const normalizedSlug = normalizeBlogSlug(decodeURIComponent(slug || ''));
  if (!normalizedSlug) {
    return null;
  }

  try {
    const directSnapshot = await adminDb
      .collection('blogPosts')
      .where('slug', '==', normalizedSlug)
      .limit(1)
      .get();

    if (!directSnapshot.empty) {
      const entry = normalizeBlogPostDocument(
        directSnapshot.docs[0].data(),
        directSnapshot.docs[0].id
      );
      return isBlogPostPublished(entry) ? entry : null;
    }
  } catch (error) {
    console.error('Failed to fetch blog post by direct slug query:', error);
  }

  const publishedPosts = await getPublishedBlogPosts();
  return publishedPosts.find((post) => post.slug === normalizedSlug) || null;
}
