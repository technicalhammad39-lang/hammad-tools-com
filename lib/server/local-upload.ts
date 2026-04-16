import { randomUUID } from 'crypto';
import { mkdir } from 'fs/promises';
import { extname, isAbsolute, join, normalize, resolve } from 'path';
import { ApiError } from './http';

export const ALLOWED_UPLOAD_FOLDERS = ['products', 'users', 'banners', 'payments'] as const;
export type UploadFolder = (typeof ALLOWED_UPLOAD_FOLDERS)[number];

const ALLOWED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'pdf']);
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]);

function toPositiveNumber(value: string | undefined, fallback: number) {
  if (!value) {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function getUploadRootDirectory() {
  const configuredRoot = process.env.LOCAL_UPLOAD_ROOT?.trim();
  if (!configuredRoot) {
    return resolve(join(process.cwd(), 'public', 'uploads'));
  }

  if (isAbsolute(configuredRoot)) {
    return resolve(configuredRoot);
  }

  return resolve(join(process.cwd(), configuredRoot));
}

export function getUploadPublicBasePath() {
  const configured = process.env.LOCAL_UPLOAD_PUBLIC_BASE?.trim();
  if (!configured) {
    return '/uploads';
  }

  const withSlash = configured.startsWith('/') ? configured : `/${configured}`;
  return withSlash.replace(/\/+$/, '') || '/uploads';
}

export function getMaxUploadBytes() {
  const maxMegabytes = toPositiveNumber(process.env.LOCAL_UPLOAD_MAX_MB, 8);
  return Math.floor(maxMegabytes * 1024 * 1024);
}

export function normalizeUploadFolder(input: string | null | undefined): UploadFolder {
  const candidate = (input || '').trim().toLowerCase();
  if (!candidate) {
    return 'products';
  }

  if ((ALLOWED_UPLOAD_FOLDERS as readonly string[]).includes(candidate)) {
    return candidate as UploadFolder;
  }

  throw new ApiError(
    400,
    `Invalid upload folder. Allowed folders: ${ALLOWED_UPLOAD_FOLDERS.join(', ')}`
  );
}

function normalizeExtension(name: string) {
  return extname(name || '').replace('.', '').toLowerCase();
}

function sanitizeBaseName(name: string) {
  const raw = name.replace(extname(name), '');
  const safe = raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);

  return safe || 'file';
}

export function validateUploadFile(file: File, maxBytes = getMaxUploadBytes()) {
  if (!(file instanceof File)) {
    throw new ApiError(400, 'File is required.');
  }

  if (file.size <= 0) {
    throw new ApiError(400, 'Uploaded file is empty.');
  }

  if (file.size > maxBytes) {
    throw new ApiError(400, `File exceeds max size of ${Math.round(maxBytes / (1024 * 1024))}MB.`);
  }

  const extension = normalizeExtension(file.name);
  if (!ALLOWED_EXTENSIONS.has(extension)) {
    throw new ApiError(400, 'Invalid file extension. Allowed: jpg, jpeg, png, webp, pdf.');
  }

  if (file.type && !ALLOWED_MIME_TYPES.has(file.type)) {
    throw new ApiError(400, 'Invalid file type. Allowed: jpg, jpeg, png, webp, pdf.');
  }

  return extension;
}

export function generateUniqueFileName(originalName: string, extension: string) {
  const safeBase = sanitizeBaseName(originalName || 'file');
  const timestamp = Date.now();
  const token = randomUUID().replace(/-/g, '').slice(0, 12);
  return `${safeBase}-${timestamp}-${token}.${extension}`;
}

export async function ensureUploadFolder(folder: UploadFolder) {
  const uploadRoot = getUploadRootDirectory();
  const folderPath = resolve(join(uploadRoot, folder));

  if (!folderPath.startsWith(uploadRoot)) {
    throw new ApiError(500, 'Unsafe upload folder path.');
  }

  await mkdir(folderPath, { recursive: true });
  return folderPath;
}

export function getRelativeStoragePath(folder: UploadFolder, fileName: string) {
  return normalize(join('uploads', folder, fileName)).replace(/\\/g, '/');
}

export function getPublicFilePath(folder: UploadFolder, fileName: string) {
  const publicBase = getUploadPublicBasePath();
  return `${publicBase}/${folder}/${fileName}`.replace(/\/+/g, '/');
}

export function getAbsoluteFilePathFromStoragePath(storagePath: string) {
  const uploadRoot = getUploadRootDirectory();
  const normalized = (storagePath || '').replace(/\\/g, '/').replace(/^\/+/, '');

  if (!normalized.startsWith('uploads/')) {
    throw new ApiError(400, 'Invalid storage path.');
  }

  const relativeFromRoot = normalized.slice('uploads/'.length);
  const absolute = resolve(join(uploadRoot, relativeFromRoot));

  if (!absolute.startsWith(uploadRoot)) {
    throw new ApiError(400, 'Unsafe storage path.');
  }

  return absolute;
}

export function toPublicUrl(request: Request, publicPath: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
  if (appUrl) {
    return new URL(publicPath, appUrl).toString();
  }

  return new URL(publicPath, request.url).toString();
}

export function normalizeOptionalText(input: FormDataEntryValue | null) {
  if (typeof input !== 'string') {
    return '';
  }
  return input.trim();
}
