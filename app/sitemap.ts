import type { MetadataRoute } from 'next';
import { adminDb } from '@/lib/server/firebase-admin';
import { getSiteUrl, toSlugFromTitle } from '@/lib/seo';

type CollectionDoc = {
  slug?: string;
  title?: string;
  name?: string;
  active?: boolean;
  published?: boolean;
  type?: string;
  updatedAt?: { toDate?: () => Date } | Date | string | null;
  createdAt?: { toDate?: () => Date } | Date | string | null;
};

function asDate(value: CollectionDoc['updatedAt']) {
  if (!value) return new Date();
  if (typeof (value as any)?.toDate === 'function') {
    return (value as any).toDate() as Date;
  }
  let date: Date;
  if (value instanceof Date) {
    date = value;
  } else if (typeof value === 'string' || typeof value === 'number') {
    date = new Date(value);
  } else {
    date = new Date();
  }
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function withSite(path: string) {
  const safePath = path.startsWith('/') ? path : `/${path}`;
  return `${getSiteUrl()}${safePath}`.replace(/([^:]\/)\/+/g, '$1');
}

function slugFromDoc(doc: CollectionDoc) {
  const raw = (doc.slug || '').trim().toLowerCase();
  if (raw) return raw;
  return toSlugFromTitle((doc.title || doc.name || '').toString());
}

async function getToolEntries() {
  try {
    const snapshot = await adminDb.collection('services').get();
    return snapshot.docs
      .map((entry) => entry.data() as CollectionDoc)
      .filter((item) => (item.type || 'tools') === 'tools' && item.active !== false)
      .map((item) => ({ slug: slugFromDoc(item), lastModified: asDate(item.updatedAt || item.createdAt) }))
      .filter((item) => Boolean(item.slug));
  } catch {
    return [] as Array<{ slug: string; lastModified: Date }>;
  }
}

async function getBlogEntries() {
  try {
    const snapshot = await adminDb.collection('blogPosts').get();
    return snapshot.docs
      .map((entry) => entry.data() as CollectionDoc)
      .filter((item) => item.published !== false)
      .map((item) => ({ slug: slugFromDoc(item), lastModified: asDate(item.updatedAt || item.createdAt) }))
      .filter((item) => Boolean(item.slug));
  } catch {
    return [] as Array<{ slug: string; lastModified: Date }>;
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: withSite('/'), lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: withSite('/tools'), lastModified: now, changeFrequency: 'daily', priority: 0.95 },
    { url: withSite('/services'), lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: withSite('/blog'), lastModified: now, changeFrequency: 'daily', priority: 0.85 },
    { url: withSite('/giveaway'), lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: withSite('/about'), lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: withSite('/contact'), lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: withSite('/privacy'), lastModified: now, changeFrequency: 'yearly', priority: 0.4 },
    { url: withSite('/terms'), lastModified: now, changeFrequency: 'yearly', priority: 0.4 },
  ];

  const [toolEntries, blogEntries] = await Promise.all([getToolEntries(), getBlogEntries()]);
  const toolRoutes: MetadataRoute.Sitemap = toolEntries.map((entry) => ({
    url: withSite(`/tools/${entry.slug}`),
    lastModified: entry.lastModified,
    changeFrequency: 'weekly',
    priority: 0.9,
  }));
  const blogRoutes: MetadataRoute.Sitemap = blogEntries.map((entry) => ({
    url: withSite(`/blog/${entry.slug}`),
    lastModified: entry.lastModified,
    changeFrequency: 'weekly',
    priority: 0.75,
  }));

  const deduped = new Map<string, MetadataRoute.Sitemap[number]>();
  [...staticRoutes, ...toolRoutes, ...blogRoutes].forEach((entry) => {
    deduped.set(entry.url, entry);
  });
  return Array.from(deduped.values());
}
