import type { MetadataRoute } from 'next';
import { adminDb } from '@/lib/server/firebase-admin';
import { getSiteUrl, toSlugFromTitle } from '@/lib/seo';

type CollectionDoc = {
  slug?: string;
  title?: string;
  name?: string;
  active?: boolean;
  status?: string;
  published?: boolean;
  publishedAt?: { toDate?: () => Date } | Date | string | null;
  type?: string;
  updatedAt?: { toDate?: () => Date } | Date | string | null;
  createdAt?: { toDate?: () => Date } | Date | string | null;
};

const SITEMAP_FIRESTORE_TIMEOUT_MS = Number(process.env.SITEMAP_FIRESTORE_TIMEOUT_MS || 5000);

function hasFirebaseAdminCredentials() {
  const projectId = (process.env.FIREBASE_PROJECT_ID || '').trim();
  const clientEmail = (process.env.FIREBASE_CLIENT_EMAIL || '').trim();
  const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').trim();
  const privateKeyBase64 = (process.env.FIREBASE_PRIVATE_KEY_BASE64 || '').trim();
  const googleCloudProject = (process.env.GOOGLE_CLOUD_PROJECT || '').trim();
  return Boolean(projectId && clientEmail && googleCloudProject && (privateKey || privateKeyBase64));
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  const safeTimeout = Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 5000;
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`${label} timed out after ${safeTimeout}ms`));
      }, safeTimeout);
    }),
  ]);
}

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

function isPublishedBlog(item: CollectionDoc) {
  const status = (item.status || '').toString().toLowerCase();
  const published = status === 'published' || item.published === true;
  if (!published) {
    return false;
  }

  const publishedAt = asDate(item.publishedAt || item.createdAt || null);
  return publishedAt.getTime() <= Date.now();
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
  if (!hasFirebaseAdminCredentials()) {
    return [] as Array<{ slug: string; lastModified: Date }>;
  }

  try {
    const snapshot = await withTimeout(
      adminDb.collection('services').get(),
      SITEMAP_FIRESTORE_TIMEOUT_MS,
      'sitemap/services fetch'
    );
    return snapshot.docs
      .map((entry) => entry.data() as CollectionDoc)
      .filter((item) => (item.type || 'tools') === 'tools' && item.active !== false)
      .map((item) => ({ slug: slugFromDoc(item), lastModified: asDate(item.updatedAt || item.createdAt) }))
      .filter((item) => Boolean(item.slug));
  } catch {
    return [] as Array<{ slug: string; lastModified: Date }>;
  }
}

async function getAgencyServiceEntries() {
  if (!hasFirebaseAdminCredentials()) {
    return [] as Array<{ slug: string; lastModified: Date }>;
  }

  try {
    const snapshot = await withTimeout(
      adminDb.collection('agency_services').get(),
      SITEMAP_FIRESTORE_TIMEOUT_MS,
      'sitemap/agency_services fetch'
    );
    return snapshot.docs
      .map((entry) => entry.data() as CollectionDoc)
      .filter((item) => item.active !== false)
      .map((item) => ({ slug: slugFromDoc(item), lastModified: asDate(item.updatedAt || item.createdAt) }))
      .filter((item) => Boolean(item.slug));
  } catch {
    return [] as Array<{ slug: string; lastModified: Date }>;
  }
}

async function getBlogEntries() {
  if (!hasFirebaseAdminCredentials()) {
    return [] as Array<{ slug: string; lastModified: Date }>;
  }

  try {
    const snapshot = await withTimeout(
      adminDb.collection('blogPosts').get(),
      SITEMAP_FIRESTORE_TIMEOUT_MS,
      'sitemap/blogPosts fetch'
    );
    return snapshot.docs
      .map((entry) => entry.data() as CollectionDoc)
      .filter((item) => isPublishedBlog(item))
      .map((item) => ({ slug: slugFromDoc(item), lastModified: asDate(item.updatedAt || item.publishedAt || item.createdAt) }))
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
    { url: withSite('/blogs'), lastModified: now, changeFrequency: 'daily', priority: 0.85 },
    { url: withSite('/giveaway'), lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: withSite('/about'), lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: withSite('/contact'), lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: withSite('/privacy'), lastModified: now, changeFrequency: 'yearly', priority: 0.4 },
    { url: withSite('/terms'), lastModified: now, changeFrequency: 'yearly', priority: 0.4 },
  ];

  const [toolEntries, blogEntries, agencyServiceEntries] = await Promise.all([
    getToolEntries(),
    getBlogEntries(),
    getAgencyServiceEntries(),
  ]);
  const toolRoutes: MetadataRoute.Sitemap = toolEntries.map((entry) => ({
    url: withSite(`/tools/${entry.slug}`),
    lastModified: entry.lastModified,
    changeFrequency: 'weekly',
    priority: 0.9,
  }));
  const agencyServiceRoutes: MetadataRoute.Sitemap = agencyServiceEntries.map((entry) => ({
    url: withSite(`/services/${entry.slug}`),
    lastModified: entry.lastModified,
    changeFrequency: 'weekly',
    priority: 0.8,
  }));
  const blogRoutes: MetadataRoute.Sitemap = blogEntries.map((entry) => ({
    url: withSite(`/blogs/${entry.slug}`),
    lastModified: entry.lastModified,
    changeFrequency: 'weekly',
    priority: 0.75,
  }));

  const deduped = new Map<string, MetadataRoute.Sitemap[number]>();
  [...staticRoutes, ...toolRoutes, ...agencyServiceRoutes, ...blogRoutes].forEach((entry) => {
    deduped.set(entry.url, entry);
  });
  return Array.from(deduped.values());
}
