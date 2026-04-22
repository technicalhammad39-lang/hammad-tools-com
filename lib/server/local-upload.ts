import { randomUUID } from 'crypto';
import { constants as fsConstants } from 'fs';
import { access, mkdir, stat, unlink, writeFile } from 'fs/promises';
import { extname, isAbsolute, join, normalize, relative, resolve } from 'path';
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
  const value = toPositiveNumber(process.env.HOSTINGER_UPLOAD_MAX_MB, 8);
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

function parseBooleanEnv(rawValue: string | undefined, fallback = false) {
  if (rawValue == null || rawValue.trim() === '') {
    return fallback;
  }

  const normalized = rawValue.trim().toLowerCase();
  if (normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on') {
    return true;
  }
  if (normalized === '0' || normalized === 'false' || normalized === 'no' || normalized === 'off') {
    return false;
  }

  return fallback;
}

export function isUploadDebugEnabled() {
  return parseBooleanEnv(process.env.HOSTINGER_UPLOAD_DEBUG, false);
}

function getPathWithinWorkspace(configuredPath: string) {
  if (isAbsolute(configuredPath)) {
    return resolve(configuredPath);
  }
  return resolve(join(process.cwd(), configuredPath));
}

function isPathWithinRoot(rootPath: string, targetPath: string) {
  const normalizedRoot = resolve(rootPath);
  const normalizedTarget = resolve(targetPath);
  const relativePath = relative(normalizedRoot, normalizedTarget);
  return relativePath === '' || (!relativePath.startsWith('..') && !isAbsolute(relativePath));
}

export function getPublicUploadRootDirectory() {
  const configuredRoot = process.env.HOSTINGER_PUBLIC_UPLOAD_ROOT?.trim();
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
  const configured = process.env.HOSTINGER_UPLOAD_PUBLIC_BASE?.trim();
  if (!configured) {
    return '/uploads';
  }

  // Allow absolute URL bases (for example: https://example.com/uploads)
  // without forcing an extra leading slash.
  if (/^https?:\/\//i.test(configured)) {
    return configured.replace(/\/+$/, '');
  }

  const withSlash = configured.startsWith('/') ? configured : `/${configured}`;
  return withSlash.replace(/\/+$/, '') || '/uploads';
}

function asEnvValue(value: string | undefined) {
  const normalized = (value || '').trim();
  return normalized || null;
}

function formatFsError(error: unknown) {
  const code =
    typeof error === 'object' && error && 'code' in error ? String((error as any).code || '') : '';
  const message =
    typeof error === 'object' && error && 'message' in error
      ? String((error as any).message || '')
      : String(error || '');
  return [code, message].filter(Boolean).join(': ') || 'Unknown filesystem error';
}

export function getUploadEnvironmentSummary() {
  const publicRoot = asEnvValue(process.env.HOSTINGER_PUBLIC_UPLOAD_ROOT);
  const privateRoot = asEnvValue(process.env.HOSTINGER_PRIVATE_UPLOAD_ROOT);
  const publicBase = asEnvValue(process.env.HOSTINGER_UPLOAD_PUBLIC_BASE);
  const appUrl = asEnvValue(process.env.NEXT_PUBLIC_APP_URL);

  return {
    HOSTINGER_PUBLIC_UPLOAD_ROOT: { present: Boolean(publicRoot), value: publicRoot },
    HOSTINGER_PRIVATE_UPLOAD_ROOT: { present: Boolean(privateRoot), value: privateRoot },
    HOSTINGER_UPLOAD_PUBLIC_BASE: { present: Boolean(publicBase), value: publicBase },
    HOSTINGER_UPLOAD_MAX_MB: {
      present: Boolean(asEnvValue(process.env.HOSTINGER_UPLOAD_MAX_MB)),
      value: asEnvValue(process.env.HOSTINGER_UPLOAD_MAX_MB),
    },
    HOSTINGER_PAYMENT_PROOF_MAX_MB: {
      present: Boolean(asEnvValue(process.env.HOSTINGER_PAYMENT_PROOF_MAX_MB)),
      value: asEnvValue(process.env.HOSTINGER_PAYMENT_PROOF_MAX_MB),
    },
    HOSTINGER_CHAT_ATTACHMENT_MAX_MB: {
      present: Boolean(asEnvValue(process.env.HOSTINGER_CHAT_ATTACHMENT_MAX_MB)),
      value: asEnvValue(process.env.HOSTINGER_CHAT_ATTACHMENT_MAX_MB),
    },
    NEXT_PUBLIC_APP_URL: { present: Boolean(appUrl), value: appUrl },
  };
}

type UploadPathDiagnostics = {
  absolutePath: string;
  exists: boolean;
  writable: boolean;
  ensuredDirectory: boolean;
  writeTest: {
    success: boolean;
    error: string | null;
  };
  error: string | null;
};

type UploadRuntimeDiagnosticsOptions = {
  ensureDirectories?: boolean;
  attemptWriteTest?: boolean;
};

async function probeUploadPath(
  absolutePath: string,
  options?: UploadRuntimeDiagnosticsOptions
): Promise<UploadPathDiagnostics> {
  const ensureDirectories = options?.ensureDirectories === true;
  const attemptWriteTest = options?.attemptWriteTest === true;

  let exists = false;
  let writable = false;
  let ensuredDirectory = false;
  let error: string | null = null;
  let writeTestError: string | null = null;
  let writeTestSuccess = false;

  try {
    const stats = await stat(absolutePath);
    exists = stats.isDirectory();
    if (!stats.isDirectory()) {
      error = 'Path exists but is not a directory.';
    }
  } catch (statError: any) {
    if (statError?.code === 'ENOENT') {
      if (ensureDirectories) {
        try {
          await mkdir(absolutePath, { recursive: true });
          ensuredDirectory = true;
          exists = true;
        } catch (mkdirError) {
          error = `mkdir failed: ${formatFsError(mkdirError)}`;
        }
      }
    } else {
      error = `stat failed: ${formatFsError(statError)}`;
    }
  }

  if (exists) {
    try {
      await access(absolutePath, fsConstants.W_OK);
      writable = true;
    } catch (accessError) {
      writable = false;
      if (!error) {
        error = `write access failed: ${formatFsError(accessError)}`;
      }
    }
  }

  if (exists && writable && attemptWriteTest) {
    const testFile = join(
      absolutePath,
      `.upload-diagnostic-${Date.now()}-${randomUUID().replace(/-/g, '').slice(0, 10)}.tmp`
    );
    try {
      await writeFile(testFile, 'upload-diagnostic-ok', { flag: 'wx' });
      await unlink(testFile);
      writeTestSuccess = true;
    } catch (writeError) {
      writeTestSuccess = false;
      writeTestError = formatFsError(writeError);
      if (!error) {
        error = `write test failed: ${writeTestError}`;
      }
    }
  }

  return {
    absolutePath,
    exists,
    writable,
    ensuredDirectory,
    writeTest: {
      success: writeTestSuccess,
      error: writeTestError,
    },
    error,
  };
}

export async function getUploadRuntimeDiagnostics(options?: UploadRuntimeDiagnosticsOptions) {
  const processCwd = process.cwd();
  const publicRoot = getPublicUploadRootDirectory();
  const privateRoot = getPrivateUploadRootDirectory();
  const publicBasePath = getUploadPublicBasePath();

  const [publicRootState, privateRootState] = await Promise.all([
    probeUploadPath(publicRoot, options),
    probeUploadPath(privateRoot, options),
  ]);

  return {
    timestamp: new Date().toISOString(),
    processCwd,
    uploadPublicBasePath: publicBasePath,
    environment: getUploadEnvironmentSummary(),
    resolved: {
      publicRoot: publicRootState,
      privateRoot: privateRootState,
    },
  };
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

  if (!isPathWithinRoot(uploadRoot, folderPath)) {
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
  if (/^https?:\/\//i.test(publicBase)) {
    const base = publicBase.endsWith('/') ? publicBase : `${publicBase}/`;
    return new URL(`${folder}/${fileName}`, base).toString();
  }

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
  if (!isPathWithinRoot(uploadRoot, absolute)) {
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
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

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
