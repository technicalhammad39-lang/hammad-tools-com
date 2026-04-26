type Dictionary = Record<string, unknown>;

const ABSOLUTE_HTTP_REGEX = /^https?:\/\//i;
const PROTOCOL_RELATIVE_REGEX = /^\/\//;
const LEADING_SLASH_ABSOLUTE_REGEX = /^\/+https?:\/\//i;
const UNSAFE_SCHEME_REGEX = /^[a-z][a-z0-9+.-]*:/i;
const BLOB_SCHEME_REGEX = /^blob:/i;
const DATA_IMAGE_SCHEME_REGEX = /^data:image\//i;
const HOSTINGER_PUBLIC_UPLOAD_PREFIX = '/public/uploads/';
const HOSTINGER_PRIVATE_UPLOAD_PREFIX = '/storage/uploads/';
const PROTECTED_MEDIA_FOLDERS = new Set(['payment-proofs', 'chat-attachments']);

const DEFAULT_MEDIA_PATHS = [
  'imageMedia',
  'coverImageMedia',
  'thumbnailMedia',
  'media',
  'attachmentMedia',
  'screenshotMedia',
  'paymentProofMedia',
];

const DEFAULT_STRING_PATHS = [
  'imageUrl',
  'coverImageUrl',
  'thumbnailUrl',
  'thumbnail',
  'image',
  'fileUrl',
  'url',
  'publicUrl',
  'publicPath',
  'protectedPath',
  'apiPath',
  'attachmentUrl',
  'src',
  'storagePath',
];

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

function dedupePaths(values: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const path = (value || '').trim();
    if (!path || seen.has(path)) {
      continue;
    }
    seen.add(path);
    result.push(path);
  }
  return result;
}

function deriveUrlFromStoragePath(storagePath: string, mediaId: string, isProtectedMedia: boolean) {
  const normalizedStorage = storagePath.replace(/\\/g, '/').replace(/^\/+/, '');
  if (!normalizedStorage) {
    return '';
  }

  if (normalizedStorage.startsWith('uploads/')) {
    return `/uploads/${normalizedStorage.slice('uploads/'.length)}`;
  }

  if (normalizedStorage.startsWith('public/uploads/')) {
    return `/uploads/${normalizedStorage.slice('public/uploads/'.length)}`;
  }

  if (normalizedStorage.startsWith('storage/uploads/')) {
    return mediaId && isProtectedMedia ? `/api/upload/${encodeURIComponent(mediaId)}` : '';
  }

  return '';
}

export function getMediaUrl(media: unknown): string {
  if (typeof media === 'string') {
    return media.trim();
  }

  if (!media || typeof media !== 'object' || Array.isArray(media)) {
    return '';
  }

  const dictionary = media as Dictionary;
  const mediaId = toTrimmedString(dictionary.mediaId);
  const access = toTrimmedString(dictionary.access).toLowerCase();
  const folder = toTrimmedString(dictionary.folder).toLowerCase();
  const storagePath = toTrimmedString(dictionary.storagePath);
  const isProtectedMedia = access === 'protected' || PROTECTED_MEDIA_FOLDERS.has(folder);

  const explicitProtectedPath =
    toTrimmedString(dictionary.protectedPath) || toTrimmedString(dictionary.apiPath);
  const explicitPublicPath =
    toTrimmedString(dictionary.publicUrl) || toTrimmedString(dictionary.publicPath);
  const explicitUrl =
    toTrimmedString(dictionary.fileUrl) ||
    toTrimmedString(dictionary.url) ||
    toTrimmedString(dictionary.attachmentUrl) ||
    toTrimmedString(dictionary.imageUrl) ||
    toTrimmedString(dictionary.thumbnailUrl) ||
    toTrimmedString(dictionary.src) ||
    toTrimmedString(dictionary.path);

  if (isProtectedMedia && mediaId) {
    return `/api/upload/${encodeURIComponent(mediaId)}`;
  }

  if (explicitProtectedPath) {
    const normalizedProtectedPath = normalizeImageUrl(explicitProtectedPath);
    if (normalizedProtectedPath) {
      return normalizedProtectedPath;
    }
  }

  if (explicitPublicPath) {
    const normalizedPublicPath = normalizeImageUrl(explicitPublicPath);
    if (normalizedPublicPath) {
      return normalizedPublicPath;
    }
  }

  if (explicitUrl) {
    const normalizedExplicitUrl = normalizeImageUrl(explicitUrl);
    if (normalizedExplicitUrl) {
      return normalizedExplicitUrl;
    }
  }

  const fromStoragePath = deriveUrlFromStoragePath(storagePath, mediaId, isProtectedMedia);
  if (fromStoragePath) {
    return fromStoragePath;
  }

  if (mediaId) {
    return `/api/upload/${encodeURIComponent(mediaId)}`;
  }

  return '';
}

export function normalizeImageUrl(input: unknown): string {
  let value = toTrimmedString(input);
  if (!value) {
    return '';
  }
  value = value.replace(/\\/g, '/');

  if (BLOB_SCHEME_REGEX.test(value) || DATA_IMAGE_SCHEME_REGEX.test(value)) {
    return value;
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
      if (parsed.pathname.startsWith(HOSTINGER_PUBLIC_UPLOAD_PREFIX)) {
        return parsed.pathname.replace(HOSTINGER_PUBLIC_UPLOAD_PREFIX, '/uploads/');
      }
      if (parsed.pathname.startsWith(HOSTINGER_PRIVATE_UPLOAD_PREFIX)) {
        return '';
      }
      if (parsed.pathname.startsWith('/uploads/') || parsed.pathname.startsWith('/api/upload/')) {
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

  // Accept Hostinger filesystem-like paths that may appear in legacy docs.
  if (value.startsWith(HOSTINGER_PUBLIC_UPLOAD_PREFIX)) {
    return value.replace(HOSTINGER_PUBLIC_UPLOAD_PREFIX, '/uploads/');
  }
  if (value.startsWith(HOSTINGER_PRIVATE_UPLOAD_PREFIX)) {
    return '';
  }

  if (value.startsWith('public/uploads/')) {
    return `/${value.slice('public/'.length)}`;
  }
  if (value.startsWith('storage/uploads/')) {
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

export function resolveStoredMediaUrl(media: unknown): string {
  return normalizeImageUrl(getMediaUrl(media));
}

export function resolveImageSource(
  input: unknown,
  options: ResolveImageSourceOptions = {}
): string {
  const mediaPaths = dedupePaths([...(options.mediaPaths || []), ...DEFAULT_MEDIA_PATHS]);
  const stringPaths = dedupePaths([...(options.stringPaths || []), ...DEFAULT_STRING_PATHS]);

  for (const path of mediaPaths) {
    const normalized = normalizeImageUrl(getMediaUrl(getPathValue(input, path)));
    if (normalized) {
      return normalized;
    }
  }

  const directMedia = normalizeImageUrl(getMediaUrl(input));
  if (directMedia) {
    return directMedia;
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
