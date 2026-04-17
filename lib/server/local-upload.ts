import { randomUUID } from 'crypto';
import { mkdir } from 'fs/promises';
import { extname, isAbsolute, join, normalize, resolve } from 'path';
import { ApiError } from './http';

export const ALLOWED_UPLOAD_FOLDERS = [
  'tools',
  'services',
  'blogs',
  'partners',
  'payment-proofs',
  'chat-attachments',
  'profiles',
] as const;
export type UploadFolder = (typeof ALLOWED_UPLOAD_FOLDERS)[number];
export type UploadAccess = 'public' | 'protected';

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'avif'] as const;
const IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
] as const;

const FOLDER_ALIASES: Record<string, UploadFolder> = {
  tools: 'tools',
  tool: 'tools',
  products: 'tools',
  product: 'tools',
  services: 'services',
  service: 'services',
  categories: 'services',
  category: 'services',
  giveaways: 'services',
  giveaway: 'services',
  'agency-services': 'services',
  agency: 'services',
  blogs: 'blogs',
  blog: 'blogs',
  partners: 'partners',
  partner: 'partners',
  logos: 'partners',
  logo: 'partners',
  banners: 'partners',
  banner: 'partners',
  payments: 'payment-proofs',
  payment: 'payment-proofs',
  'payment-proofs': 'payment-proofs',
  proofs: 'payment-proofs',
  chat: 'chat-attachments',
  chats: 'chat-attachments',
  'order-messages': 'chat-attachments',
  'chat-attachments': 'chat-attachments',
  users: 'profiles',
  user: 'profiles',
  profile: 'profiles',
  profiles: 'profiles',
};

type FolderConfig = {
  access: UploadAccess;
  allowedExtensions: readonly string[];
  allowedMimeTypes: readonly string[];
  maxBytes: () => number;
  staffOnly: boolean;
};

function toPositiveNumber(value: string | undefined, fallback: number) {
  if (!value) {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function megabytesToBytes(value: number) {
  return Math.floor(value * 1024 * 1024);
}

function getDefaultUploadMaxBytes() {
  const value = toPositiveNumber(
    process.env.HOSTINGER_UPLOAD_MAX_MB || process.env.LOCAL_UPLOAD_MAX_MB,
    8
  );
  return megabytesToBytes(value);
}

function getPaymentProofMaxBytes() {
  const value = toPositiveNumber(process.env.HOSTINGER_PAYMENT_PROOF_MAX_MB, 5);
  return megabytesToBytes(value);
}

function getChatAttachmentMaxBytes() {
  const value = toPositiveNumber(process.env.HOSTINGER_CHAT_ATTACHMENT_MAX_MB, 10);
  return megabytesToBytes(value);
}

export const UPLOAD_FOLDER_CONFIG: Record<UploadFolder, FolderConfig> = {
  tools: {
    access: 'public',
    allowedExtensions: IMAGE_EXTENSIONS,
    allowedMimeTypes: IMAGE_MIME_TYPES,
    maxBytes: getDefaultUploadMaxBytes,
    staffOnly: true,
  },
  services: {
    access: 'public',
    allowedExtensions: IMAGE_EXTENSIONS,
    allowedMimeTypes: IMAGE_MIME_TYPES,
    maxBytes: getDefaultUploadMaxBytes,
    staffOnly: true,
  },
  blogs: {
    access: 'public',
    allowedExtensions: IMAGE_EXTENSIONS,
    allowedMimeTypes: IMAGE_MIME_TYPES,
    maxBytes: getDefaultUploadMaxBytes,
    staffOnly: true,
  },
  partners: {
    access: 'public',
    allowedExtensions: IMAGE_EXTENSIONS,
    allowedMimeTypes: IMAGE_MIME_TYPES,
    maxBytes: getDefaultUploadMaxBytes,
    staffOnly: true,
  },
  'payment-proofs': {
    access: 'protected',
    allowedExtensions: ['jpg', 'jpeg', 'png', 'webp', 'pdf'],
    allowedMimeTypes: [...IMAGE_MIME_TYPES, 'application/pdf'],
    maxBytes: getPaymentProofMaxBytes,
    staffOnly: false,
  },
  'chat-attachments': {
    access: 'protected',
    allowedExtensions: ['jpg', 'jpeg', 'png', 'webp', 'pdf', 'txt', 'doc', 'docx'],
    allowedMimeTypes: [
      ...IMAGE_MIME_TYPES,
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    maxBytes: getChatAttachmentMaxBytes,
    staffOnly: false,
  },
  profiles: {
    access: 'public',
    allowedExtensions: IMAGE_EXTENSIONS,
    allowedMimeTypes: IMAGE_MIME_TYPES,
    maxBytes: getDefaultUploadMaxBytes,
    staffOnly: false,
  },
};

function getPathWithinWorkspace(configuredPath: string) {
  if (isAbsolute(configuredPath)) {
    return resolve(configuredPath);
  }
  return resolve(join(process.cwd(), configuredPath));
}

export function getPublicUploadRootDirectory() {
  const configuredRoot =
    process.env.HOSTINGER_PUBLIC_UPLOAD_ROOT?.trim() || process.env.LOCAL_UPLOAD_ROOT?.trim();
  if (!configuredRoot) {
    return resolve(join(process.cwd(), 'public', 'uploads'));
  }
  return getPathWithinWorkspace(configuredRoot);
}

export function getPrivateUploadRootDirectory() {
  const configuredRoot = process.env.HOSTINGER_PRIVATE_UPLOAD_ROOT?.trim();
  if (!configuredRoot) {
    return resolve(join(process.cwd(), 'storage', 'uploads'));
  }
  return getPathWithinWorkspace(configuredRoot);
}

export function getUploadPublicBasePath() {
  const configured =
    process.env.HOSTINGER_UPLOAD_PUBLIC_BASE?.trim() ||
    process.env.LOCAL_UPLOAD_PUBLIC_BASE?.trim();
  if (!configured) {
    return '/uploads';
  }
  const withSlash = configured.startsWith('/') ? configured : `/${configured}`;
  return withSlash.replace(/\/+$/, '') || '/uploads';
}

export function normalizeUploadFolder(input: string | null | undefined): UploadFolder {
  const candidate = (input || '').trim().toLowerCase();
  if (!candidate) {
    return 'tools';
  }

  const mapped = FOLDER_ALIASES[candidate];
  if (mapped) {
    return mapped;
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

export function getFolderAccess(folder: UploadFolder): UploadAccess {
  return UPLOAD_FOLDER_CONFIG[folder].access;
}

export function isUploadFolderProtected(folder: UploadFolder) {
  return getFolderAccess(folder) === 'protected';
}

export function isUploadFolderStaffOnly(folder: UploadFolder) {
  return UPLOAD_FOLDER_CONFIG[folder].staffOnly;
}

export function validateUploadFile(file: File, folder: UploadFolder) {
  if (!(file instanceof File)) {
    throw new ApiError(400, 'File is required.');
  }

  const config = UPLOAD_FOLDER_CONFIG[folder];
  const maxBytes = config.maxBytes();

  if (file.size <= 0) {
    throw new ApiError(400, 'Uploaded file is empty.');
  }

  if (file.size > maxBytes) {
    throw new ApiError(400, `File exceeds max size of ${Math.round(maxBytes / (1024 * 1024))}MB.`);
  }

  const extension = normalizeExtension(file.name);
  if (!extension || !config.allowedExtensions.includes(extension)) {
    throw new ApiError(
      400,
      `Invalid file extension for ${folder}. Allowed: ${config.allowedExtensions.join(', ')}.`
    );
  }

  const mimeType = (file.type || '').trim().toLowerCase();
  if (!mimeType || !config.allowedMimeTypes.includes(mimeType)) {
    throw new ApiError(
      400,
      `Invalid file type for ${folder}. Allowed: ${config.allowedMimeTypes.join(', ')}.`
    );
  }

  return {
    extension,
    mimeType,
    maxBytes,
  };
}

export function generateUniqueFileName(originalName: string, extension: string) {
  const safeBase = sanitizeBaseName(originalName || 'file');
  const timestamp = Date.now();
  const token = randomUUID().replace(/-/g, '').slice(0, 16);
  return `${safeBase}-${timestamp}-${token}.${extension}`;
}

function getRootByAccess(access: UploadAccess) {
  return access === 'public' ? getPublicUploadRootDirectory() : getPrivateUploadRootDirectory();
}

export async function ensureUploadFolder(folder: UploadFolder, access: UploadAccess) {
  const uploadRoot = getRootByAccess(access);
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

export function getProtectedMediaPath(mediaId: string) {
  return `/api/upload/${encodeURIComponent(mediaId)}`;
}

export function getAbsoluteFilePathFromStoragePath(storagePath: string, access: UploadAccess) {
  const uploadRoot = getRootByAccess(access);
  const normalizedPath = (storagePath || '').replace(/\\/g, '/').replace(/^\/+/, '');

  if (!normalizedPath.startsWith('uploads/')) {
    throw new ApiError(400, 'Invalid storage path.');
  }

  const parts = normalizedPath.split('/').filter(Boolean);
  if (parts.length < 3) {
    throw new ApiError(400, 'Invalid storage path.');
  }

  const folder = normalizeUploadFolder(parts[1]);
  const fileName = parts.slice(2).join('/');
  if (!fileName || fileName.includes('..') || fileName.includes('\\')) {
    throw new ApiError(400, 'Unsafe storage path.');
  }

  const absolute = resolve(join(uploadRoot, folder, fileName));
  if (!absolute.startsWith(uploadRoot)) {
    throw new ApiError(400, 'Unsafe storage path.');
  }

  return absolute;
}

export function resolveAccessForMedia(input: { access?: string; folder?: string }): UploadAccess {
  const directAccess = (input.access || '').trim().toLowerCase();
  if (directAccess === 'public' || directAccess === 'protected') {
    return directAccess;
  }

  const folder = normalizeUploadFolder(input.folder || '');
  return getFolderAccess(folder);
}

export function toPublicUrl(request: Request, path: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
  if (appUrl) {
    return new URL(path, appUrl).toString();
  }
  return new URL(path, request.url).toString();
}

export function normalizeOptionalText(input: FormDataEntryValue | null) {
  if (typeof input !== 'string') {
    return '';
  }
  return input.trim();
}