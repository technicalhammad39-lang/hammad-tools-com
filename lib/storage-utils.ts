import { auth } from '@/firebase';
import { onAuthStateChanged, type User } from 'firebase/auth';

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

async function waitForAuthenticatedUser(timeoutMs = 7000): Promise<User | null> {
  if (auth.currentUser) {
    return auth.currentUser;
  }

  const authStateReady = (auth as any).authStateReady;
  if (typeof authStateReady === 'function') {
    try {
      await authStateReady.call(auth);
    } catch {
      // Ignore and fallback to a state listener.
    }

    if (auth.currentUser) {
      return auth.currentUser;
    }
  }

  return new Promise<User | null>((resolve) => {
    let settled = false;
    let unsubscribe: (() => void) | null = null;

    const timer = setTimeout(() => {
      if (settled) {
        return;
      }
      settled = true;
      if (unsubscribe) {
        unsubscribe();
      }
      resolve(auth.currentUser);
    }, timeoutMs);

    unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timer);
        if (unsubscribe) {
          unsubscribe();
        }
        resolve(user);
      },
      () => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timer);
        if (unsubscribe) {
          unsubscribe();
        }
        resolve(auth.currentUser);
      }
    );
  });
}

async function getAuthHeader(forceRefresh = false) {
  const user = await waitForAuthenticatedUser();
  const token = await user?.getIdToken(forceRefresh);

  if (!token) {
    throw new Error('Authentication required for file upload. Please login again.');
  }

  return {
    Authorization: `Bearer ${token}`,
  };
}

async function parseApiPayload<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function toApiErrorMessage(payload: { error?: string } | null, fallback: string) {
  const message = (payload?.error || '').trim();
  return message || fallback;
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

  const runUploadRequest = async (forceRefreshToken = false) => {
    const response = await fetch('/api/upload', {
      method: 'POST',
      headers: await getAuthHeader(forceRefreshToken),
      body: formData,
    });
    const payload = await parseApiPayload<UploadApiResponse>(response);
    return { response, payload };
  };

  let { response, payload } = await runUploadRequest(false);

  if (response.status === 401) {
    ({ response, payload } = await runUploadRequest(true));
  }

  if (!response.ok || !payload?.success || !payload.media) {
    const fallback = `File upload failed (HTTP ${response.status || 500}).`;
    throw new Error(toApiErrorMessage(payload, fallback));
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
  const sendDeleteRequest = async (forceRefreshToken = false) => {
    const response = await fetch(`/api/upload/${encodeURIComponent(mediaId)}`, {
      method: 'DELETE',
      headers: await getAuthHeader(forceRefreshToken),
    });
    const payload = await parseApiPayload<{
      success?: boolean;
      error?: string;
      deleted?: { id: string; fileDeleted: boolean };
    }>(response);
    return { response, payload };
  };

  let { response, payload } = await sendDeleteRequest(false);

  if (response.status === 401) {
    ({ response, payload } = await sendDeleteRequest(true));
  }

  if (!response.ok || !payload?.success) {
    const fallback = `Failed to delete uploaded media (HTTP ${response.status || 500}).`;
    throw new Error(toApiErrorMessage(payload, fallback));
  }

  return payload.deleted as { id: string; fileDeleted: boolean };
}

