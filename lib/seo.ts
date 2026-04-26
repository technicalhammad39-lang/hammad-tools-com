import type { Metadata } from 'next';

export const SITE_NAME = 'Hammad Tools';
export const SITE_DESCRIPTION =
  'Hammad Tools provides cheap premium subscriptions in Pakistan, including Canva Pro, ChatGPT Plus, Netflix and more with fast delivery and secure checkout.';
export const DEFAULT_OG_IMAGE = '/logo-header.png';

export const CORE_KEYWORDS = [
  'Hammad Tools',
  'Hamad Tools',
  'Paid services by Hammad',
  'cheap subscriptions Pakistan',
  'Canva Pro cheap',
  'ChatGPT Plus cheap',
  'Netflix cheap Pakistan',
  'premium subscriptions Pakistan',
  'digital subscriptions Pakistan',
  'cheap premium tools',
];

export const TOOL_KEYWORDS = [
  'Canva Pro Pakistan',
  'ChatGPT Plus Pakistan',
  'Netflix Pakistan cheap',
  'YouTube Premium Pakistan',
  'Spotify Premium Pakistan',
  'cheap software subscriptions',
  'shared premium accounts Pakistan',
];

function normalizeText(input: string) {
  return input.trim().replace(/\s+/g, ' ');
}

const MARKDOWN_CODE_BLOCK_PATTERN = /```[\s\S]*?```/g;
const MARKDOWN_INLINE_CODE_PATTERN = /`([^`]*)`/g;
const MARKDOWN_IMAGE_PATTERN = /!\[[^\]]*]\([^)]+\)/g;
const MARKDOWN_LINK_PATTERN = /\[([^\]]+)]\(([^)]+)\)/g;
const HTML_TAG_PATTERN = /<[^>]+>/g;

function truncateAtWordBoundary(value: string, maxLength: number) {
  const normalized = normalizeText(value);
  if (!normalized) {
    return '';
  }
  const safeLimit = Math.max(80, maxLength || 160);
  if (normalized.length <= safeLimit) {
    return normalized;
  }

  const sliced = normalized.slice(0, safeLimit);
  const boundary = sliced.lastIndexOf(' ');
  const trimmed = (boundary > 72 ? sliced.slice(0, boundary) : sliced).trim();
  return `${trimmed.replace(/[.,;:!?-]+$/g, '')}...`;
}

export function toSeoPlainText(input: unknown) {
  if (typeof input !== 'string') {
    return '';
  }

  return normalizeText(
    input
      .replace(MARKDOWN_CODE_BLOCK_PATTERN, ' ')
      .replace(MARKDOWN_INLINE_CODE_PATTERN, '$1')
      .replace(MARKDOWN_IMAGE_PATTERN, ' ')
      .replace(MARKDOWN_LINK_PATTERN, '$1')
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/^\s*[-*+]\s+/gm, '')
      .replace(/^\s*\d+\.\s+/gm, '')
      .replace(/\r?\n+/g, ' ')
      .replace(HTML_TAG_PATTERN, ' ')
      .replace(/[*_~>#|]/g, ' ')
  );
}

export function buildSeoDescription(
  sources: Array<unknown>,
  fallback = SITE_DESCRIPTION,
  maxLength = 160
) {
  for (const source of sources) {
    const normalized = toSeoPlainText(source);
    if (normalized) {
      return truncateAtWordBoundary(normalized, maxLength);
    }
  }
  return truncateAtWordBoundary(toSeoPlainText(fallback) || SITE_DESCRIPTION, maxLength);
}

export function getSiteUrl() {
  const fromEnv = (process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || '').trim();
  if (!fromEnv) {
    return 'https://hammadtools.com';
  }

  try {
    const parsed = new URL(fromEnv);
    parsed.hash = '';
    parsed.search = '';
    return parsed.toString().replace(/\/+$/, '');
  } catch {
    return 'https://hammadtools.com';
  }
}

export function toAbsoluteSiteUrl(path = '/') {
  const safePath = path.startsWith('/') ? path : `/${path}`;
  return `${getSiteUrl()}${safePath}`.replace(/([^:]\/)\/+/g, '$1');
}

export function mergeKeywords(...groups: Array<string[] | undefined>) {
  const unique = new Set<string>();
  groups.forEach((group) => {
    (group || []).forEach((keyword) => {
      const value = normalizeText(keyword || '');
      if (value) {
        unique.add(value);
      }
    });
  });
  return Array.from(unique);
}

type MetadataInput = {
  title: string;
  description: string;
  path?: string;
  image?: string;
  keywords?: string[];
  noIndex?: boolean;
};

type AutoMetadataInput = {
  title: string;
  path?: string;
  image?: string;
  shortDescription?: unknown;
  longDescription?: unknown;
  content?: unknown;
  fallbackDescription?: string;
  keywords?: string[];
  noIndex?: boolean;
  maxDescriptionLength?: number;
};

export function createPageMetadata({
  title,
  description,
  path = '/',
  image = DEFAULT_OG_IMAGE,
  keywords = [],
  noIndex = false,
}: MetadataInput): Metadata {
  const canonicalUrl = toAbsoluteSiteUrl(path);
  const fullTitle = normalizeText(title);
  const fullDescription = normalizeText(description);
  const imageUrl = image.startsWith('http') ? image : toAbsoluteSiteUrl(image);
  const keywordList = mergeKeywords(CORE_KEYWORDS, keywords);

  return {
    title: fullTitle,
    description: fullDescription,
    keywords: keywordList,
    alternates: {
      canonical: canonicalUrl,
    },
    robots: noIndex
      ? {
          index: false,
          follow: false,
          nocache: true,
          googleBot: {
            index: false,
            follow: false,
            noimageindex: true,
          },
        }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            'max-image-preview': 'large',
            'max-snippet': -1,
            'max-video-preview': -1,
          },
        },
    openGraph: {
      type: 'website',
      siteName: SITE_NAME,
      url: canonicalUrl,
      title: fullTitle,
      description: fullDescription,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: `${SITE_NAME} preview`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description: fullDescription,
      images: [imageUrl],
    },
  };
}

export function createAutoPageMetadata({
  title,
  path = '/',
  image = DEFAULT_OG_IMAGE,
  shortDescription,
  longDescription,
  content,
  fallbackDescription = SITE_DESCRIPTION,
  keywords = [],
  noIndex = false,
  maxDescriptionLength = 160,
}: AutoMetadataInput): Metadata {
  const description = buildSeoDescription(
    [shortDescription, longDescription, content],
    fallbackDescription,
    maxDescriptionLength
  );

  return createPageMetadata({
    title,
    description,
    path,
    image,
    keywords,
    noIndex,
  });
}

export function toSlugFromTitle(title: string) {
  const normalized = normalizeText(title || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized;
}
