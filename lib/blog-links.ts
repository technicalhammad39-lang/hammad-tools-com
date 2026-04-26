export type BlogLinkMeta = {
  title?: string;
  nofollow: boolean;
  openInNewTab: boolean;
};

const HTTP_PROTOCOL_REGEX = /^https?:\/\//i;
const MAILTO_PROTOCOL_REGEX = /^mailto:/i;
const TEL_PROTOCOL_REGEX = /^tel:/i;
const UNSAFE_PROTOCOL_REGEX = /^(javascript|data|vbscript|file):/i;

export function normalizeBlogEditorUrl(input: string) {
  const value = (input || '').trim();
  if (!value) {
    return '';
  }

  if (
    value.startsWith('/') ||
    value.startsWith('#') ||
    MAILTO_PROTOCOL_REGEX.test(value) ||
    TEL_PROTOCOL_REGEX.test(value) ||
    HTTP_PROTOCOL_REGEX.test(value)
  ) {
    return value;
  }

  return `https://${value}`;
}

export function sanitizeBlogHref(input: string | undefined | null) {
  const value = (input || '').trim();
  if (!value) {
    return '#';
  }

  if (UNSAFE_PROTOCOL_REGEX.test(value)) {
    return '#';
  }

  if (
    value.startsWith('/') ||
    value.startsWith('#') ||
    MAILTO_PROTOCOL_REGEX.test(value) ||
    TEL_PROTOCOL_REGEX.test(value) ||
    HTTP_PROTOCOL_REGEX.test(value)
  ) {
    return value;
  }

  return '#';
}

export function isExternalBlogHref(href: string) {
  return HTTP_PROTOCOL_REGEX.test(href);
}

export function parseBlogLinkMeta(title: string | null | undefined): BlogLinkMeta {
  const value = (title || '').trim();
  if (!value) {
    return {
      title: undefined,
      nofollow: false,
      openInNewTab: false,
    };
  }

  const tokens = value
    .split('|')
    .map((entry) => entry.trim())
    .filter(Boolean);

  let nofollow = false;
  let openInNewTab = false;
  const titleTokens: string[] = [];

  tokens.forEach((token) => {
    const normalized = token.toLowerCase();
    if (normalized === 'nofollow') {
      nofollow = true;
      return;
    }
    if (normalized === 'newtab' || normalized === 'blank' || normalized === '_blank') {
      openInNewTab = true;
      return;
    }
    titleTokens.push(token);
  });

  const cleanTitle = titleTokens.join(' | ').trim();
  return {
    title: cleanTitle || undefined,
    nofollow,
    openInNewTab,
  };
}

export function buildBlogRelValue(input: { external: boolean; nofollow: boolean; openInNewTab: boolean }) {
  const parts = new Set<string>();
  if (input.openInNewTab || input.external) {
    parts.add('noopener');
    parts.add('noreferrer');
  }
  if (input.nofollow) {
    parts.add('nofollow');
  }
  return parts.size ? Array.from(parts).join(' ') : undefined;
}

