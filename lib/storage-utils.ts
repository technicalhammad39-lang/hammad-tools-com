import { auth } from '@/firebase';

export type UploadFolder =
  | 'tools'
  | 'services'
  | 'blogs'
  | 'partners'
  | 'payment-proofs'
  | 'chat-attachments'
  | 'profiles';

export interface UploadedMediaPayload {
  id: string;
  url: string;
  publicPath: string;
  storagePath: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  folder: UploadFolder;
  access: 'public' | 'protected';
}

interface UploadApiResponse {
  success: boolean;
  media?: UploadedMediaPayload;
  error?: string;
}

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
  blogs: 'blogs',
  blog: 'blogs',
  partners: 'partners',
  partner: 'partners',
  logos: 'partners',
  logo: 'partners',
  banners: 'partners',
  payments: 'payment-proofs',
  payment: 'payment-proofs',
  'payment-proofs': 'payment-proofs',
  chat: 'chat-attachments',
  'order-messages': 'chat-attachments',
  'chat-attachments': 'chat-attachments',
  users: 'profiles',
  user: 'profiles',
  profile: 'profiles',
  profiles: 'profiles',
};

function extractFolder(path: string): UploadFolder {
  const firstSegment =
    (path || '')
      .replace(/\\/g, '/')
      .split('/')
      .filter(Boolean)[0]
      ?.toLowerCase() || 'tools';

  return FOLDER_ALIASES[firstSegment] || 'tools';
}

function extractRelatedId(path: string) {
  const segments = (path || '').replace(/\\/g, '/').split('/').filter(Boolean);
  return segments[1] || '';
}

async function getAuthHeader() {
  const token = await auth.currentUser?.getIdToken();
  if (!token) {
    throw new Error('Authentication required for file upload.');
  }

  return {
    Authorization: `Bearer ${token}`,
  };
}

export interface UploadMediaOptions {
  file: File;
  folder: UploadFolder;
  relatedType?: string;
  relatedId?: string;
  relatedUserId?: string;
  relatedOrderId?: string;
  relatedProductId?: string;
  note?: string;
  replaceMediaId?: string;
}

export async function uploadMediaFile(options: UploadMediaOptions) {
  const formData = new FormData();
  formData.append('file', options.file);
  formData.append('folder', options.folder);

  if (options.relatedType) {
    formData.append('relatedType', options.relatedType);
  }
  if (options.relatedId) {
    formData.append('relatedId', options.relatedId);
  }
  if (options.relatedUserId) {
    formData.append('relatedUserId', options.relatedUserId);
  }
  if (options.relatedOrderId) {
    formData.append('relatedOrderId', options.relatedOrderId);
  }
  if (options.relatedProductId) {
    formData.append('relatedProductId', options.relatedProductId);
  }
  if (options.note) {
    formData.append('note', options.note);
  }
  if (options.replaceMediaId) {
    formData.append('replaceMediaId', options.replaceMediaId);
  }

  const response = await fetch('/api/upload', {
    method: 'POST',
    headers: await getAuthHeader(),
    body: formData,
  });

  const payload = (await response.json()) as UploadApiResponse;
  if (!response.ok || !payload.success || !payload.media) {
    throw new Error(payload.error || 'File upload failed.');
  }

  return payload.media;
}

/**
 * Compatibility wrapper for older callers.
 * `path` is only used to infer folder + related id, filename is auto-generated on the server.
 */
export const uploadFile = async (
  file: File,
  path: string,
  onProgress?: (progress: number) => void
): Promise<string> => {
  const folder = extractFolder(path);
  const relatedId = extractRelatedId(path);

  const media = await uploadMediaFile({
    file,
    folder,
    relatedType: folder === 'payment-proofs' ? 'order' : 'asset',
    relatedId,
    relatedOrderId: folder === 'payment-proofs' || folder === 'chat-attachments' ? relatedId : undefined,
  });

  if (onProgress) {
    onProgress(100);
  }

  return media.url;
};

export function toStorageMetadata(
  media: UploadedMediaPayload,
  uploadedBy?: string
): {
  mediaId: string;
  fileUrl: string;
  storagePath: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  folder: UploadFolder;
  access: 'public' | 'protected';
  uploadedBy?: string;
} {
  return {
    mediaId: media.id,
    fileUrl: media.url,
    storagePath: media.storagePath,
    fileName: media.fileName,
    mimeType: media.mimeType,
    sizeBytes: media.sizeBytes,
    folder: media.folder,
    access: media.access,
    uploadedBy,
  };
}

export function withProtectedFileToken(url: string, token: string) {
  if (!url || !token || !url.includes('/api/upload/')) {
    return url;
  }

  try {
    const base =
      typeof window !== 'undefined' && window.location?.origin
        ? window.location.origin
        : 'http://localhost';
    const parsed = new URL(url, base);
    parsed.searchParams.set('token', token);
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return parsed.toString();
    }
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return url;
  }
}

export async function deleteUploadedMedia(mediaId: string) {
  const response = await fetch(`/api/upload/${encodeURIComponent(mediaId)}`, {
    method: 'DELETE',
    headers: await getAuthHeader(),
  });

  const payload = await response.json();
  if (!response.ok || !payload.success) {
    throw new Error(payload.error || 'Failed to delete uploaded media.');
  }

  return payload.deleted as { id: string; fileDeleted: boolean };
}
