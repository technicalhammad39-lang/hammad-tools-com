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

export function toSlugFromTitle(title: string) {
  const normalized = normalizeText(title || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized;
}

