import { resolveImageSource } from '@/lib/image-display';
import { toSlugFromTitle } from '@/lib/seo';
import type { StoredFileMetadata } from '@/lib/types/domain';

export type BlogStatus = 'draft' | 'published';

type Dictionary = Record<string, unknown>;

export interface BlogPostDocument {
  id: string;
  title: string;
  slug: string;
  content: string;
  shortDescription: string;
  category: string;
  tags: string[];
  status: BlogStatus;
  publishedAt: Date | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  coverImageUrl: string;
  coverImageMedia: StoredFileMetadata | null;
  authorName: string;
  authorId: string;
}

function asDictionary(input: unknown): Dictionary {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return {};
  }
  return input as Dictionary;
}

function readString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function readStringArray(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .map((entry) => readString(entry))
      .filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  return [];
}

function readDate(value: unknown): Date | null {
  const candidate =
    (value as { toDate?: () => Date } | null | undefined)?.toDate?.() || value;
  if (!candidate) {
    return null;
  }

  if (candidate instanceof Date) {
    return Number.isNaN(candidate.getTime()) ? null : candidate;
  }

  if (typeof candidate === 'number' || typeof candidate === 'string') {
    const parsed = new Date(candidate);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
}

function extractMedia(input: unknown, fieldPaths: string[]) {
  const data = asDictionary(input);
  for (const fieldPath of fieldPaths) {
    const keys = fieldPath.split('.').filter(Boolean);
    let current: unknown = data;
    for (const key of keys) {
      if (!current || typeof current !== 'object') {
        current = null;
        break;
      }
      current = (current as Dictionary)[key];
    }
    if (current && typeof current === 'object' && !Array.isArray(current)) {
      return current as StoredFileMetadata;
    }
  }
  return null;
}

function stripMarkdown(value: string) {
  return value
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, ' ')
    .replace(/\[[^\]]+\]\(([^)]+)\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[*_~>#-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeBlogSlug(value: string) {
  return toSlugFromTitle(value || '');
}

export function normalizeBlogStatus(status: unknown, publishedFallback: unknown): BlogStatus {
  const normalized = readString(status).toLowerCase();
  if (normalized === 'published' || normalized === 'draft') {
    return normalized;
  }
  return publishedFallback === true ? 'published' : 'draft';
}

export function buildBlogShortDescription(input: {
  shortDescription?: string;
  excerpt?: string;
  content?: string;
  title?: string;
}) {
  const explicit = readString(input.shortDescription || input.excerpt);
  if (explicit) {
    return explicit;
  }

  const fromContent = stripMarkdown(readString(input.content));
  if (fromContent) {
    return fromContent.slice(0, 200);
  }

  const fromTitle = readString(input.title);
  if (fromTitle) {
    return `${fromTitle} - ${'Hammad Tools blog post'}`;
  }

  return 'Hammad Tools blog post';
}

export function normalizeBlogPostDocument(input: unknown, id = ''): BlogPostDocument {
  const data = asDictionary(input);
  const title = readString(data.title) || 'Untitled Blog';
  const slug = normalizeBlogSlug(readString(data.slug)) || normalizeBlogSlug(title) || id;
  const content = readString(data.content);
  const shortDescription = buildBlogShortDescription({
    shortDescription: readString(data.shortDescription),
    excerpt: readString(data.excerpt),
    content,
    title,
  });
  const status = normalizeBlogStatus(data.status, data.published);
  const publishedAt =
    readDate(data.publishedAt) || readDate(data.date) || (status === 'published' ? readDate(data.createdAt) : null);

  const coverImageUrl = resolveImageSource(data, {
    mediaPaths: ['coverImageMedia', 'thumbnailMedia', 'imageMedia'],
    stringPaths: [
      'coverImageUrl',
      'coverImage',
      'thumbnail',
      'imageUrl',
      'image',
      'thumbnailUrl',
    ],
  });
  const coverImageMedia = extractMedia(data, ['coverImageMedia', 'thumbnailMedia', 'imageMedia']);

  return {
    id,
    title,
    slug,
    content,
    shortDescription,
    category: readString(data.category),
    tags: readStringArray(data.tags),
    status,
    publishedAt,
    createdAt: readDate(data.createdAt),
    updatedAt: readDate(data.updatedAt),
    coverImageUrl,
    coverImageMedia,
    authorName: readString(data.authorName || data.author) || 'Hammad Tools Team',
    authorId: readString(data.authorId),
  };
}

export function isBlogPostPublished(post: BlogPostDocument, now = new Date()) {
  if (post.status !== 'published') {
    return false;
  }
  if (!post.publishedAt) {
    return true;
  }
  return post.publishedAt.getTime() <= now.getTime();
}

export function blogSortTimestamp(post: BlogPostDocument) {
  const value = post.publishedAt || post.updatedAt || post.createdAt;
  return value ? value.getTime() : 0;
}

export function formatBlogPublishDate(value: Date | null) {
  if (!value) {
    return 'Recently';
  }
  return value.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}
