type Dictionary = Record<string, unknown>;

const ABSOLUTE_HTTP_REGEX = /^https?:\/\//i;
const PROTOCOL_RELATIVE_REGEX = /^\/\//;
const LEADING_SLASH_ABSOLUTE_REGEX = /^\/+https?:\/\//i;
const UNSAFE_SCHEME_REGEX = /^[a-z][a-z0-9+.-]*:/i;

interface ResolveImageSourceOptions {
  mediaPaths?: string[];
  stringPaths?: string[];
  placeholder?: string;
}

function toTrimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function getPathValue(input: unknown, path: string): unknown {
  if (!input || typeof input !== 'object' || !path) {
    return undefined;
  }

  const segments = path.split('.').filter(Boolean);
  let current: unknown = input;

  for (const segment of segments) {
    if (!current || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Dictionary)[segment];
  }

  return current;
}

function getMediaUrl(media: unknown): string {
  if (!media || typeof media !== 'object' || Array.isArray(media)) {
    return '';
  }

  const dictionary = media as Dictionary;
  return (
    toTrimmedString(dictionary.fileUrl) ||
    toTrimmedString(dictionary.url) ||
    toTrimmedString(dictionary.imageUrl) ||
    toTrimmedString(dictionary.thumbnailUrl) ||
    toTrimmedString(dictionary.src)
  );
}

export function normalizeImageUrl(input: unknown): string {
  let value = toTrimmedString(input);
  if (!value) {
    return '';
  }

  if (LEADING_SLASH_ABSOLUTE_REGEX.test(value)) {
    value = value.replace(/^\/+/, '');
  }

  if (PROTOCOL_RELATIVE_REGEX.test(value)) {
    value = `https:${value}`;
  }

  if (ABSOLUTE_HTTP_REGEX.test(value)) {
    try {
      const parsed = new URL(value);
      if (parsed.pathname.startsWith('/uploads/')) {
        return `${parsed.pathname}${parsed.search}${parsed.hash}`;
      }
      return parsed.toString();
    } catch {
      return '';
    }
  }

  if (UNSAFE_SCHEME_REGEX.test(value)) {
    return '';
  }

  if (value.startsWith('uploads/')) {
    return `/${value}`;
  }

  if (!value.startsWith('/')) {
    return `/${value}`;
  }

  return value;
}

export function resolveImageSource(
  input: unknown,
  options: ResolveImageSourceOptions = {}
): string {
  const mediaPaths = options.mediaPaths || [];
  const stringPaths = options.stringPaths || [];

  for (const path of mediaPaths) {
    const normalized = normalizeImageUrl(getMediaUrl(getPathValue(input, path)));
    if (normalized) {
      return normalized;
    }
  }

  for (const path of stringPaths) {
    const normalized = normalizeImageUrl(getPathValue(input, path));
    if (normalized) {
      return normalized;
    }
  }

  return options.placeholder || '';
}

export function toMetadataImageUrl(input: unknown): string | undefined {
  const normalized = normalizeImageUrl(input);
  if (!normalized) {
    return undefined;
  }

  if (ABSOLUTE_HTTP_REGEX.test(normalized)) {
    return normalized;
  }

  const appUrl = toTrimmedString(process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL);
  if (!appUrl) {
    return undefined;
  }

  try {
    return new URL(normalized, appUrl).toString();
  } catch {
    return undefined;
  }
}
