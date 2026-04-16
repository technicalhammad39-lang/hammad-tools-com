import { auth } from '@/firebase';

interface UploadApiResponse {
  success: boolean;
  media?: {
    id: string;
    url: string;
    publicPath: string;
    storagePath: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    folder: string;
  };
  error?: string;
}

const FOLDER_ALIASES: Record<string, 'products' | 'users' | 'banners' | 'payments'> = {
  products: 'products',
  product: 'products',
  users: 'users',
  user: 'users',
  banners: 'banners',
  banner: 'banners',
  payments: 'payments',
  payment: 'payments',
  'payment-proofs': 'payments',
  'order-messages': 'users',
};

function extractFolder(path: string) {
  const firstSegment = (path || '').replace(/\\/g, '/').split('/').filter(Boolean)[0]?.toLowerCase() || 'products';
  return FOLDER_ALIASES[firstSegment] || 'products';
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
  folder: 'products' | 'users' | 'banners' | 'payments';
  relatedType?: string;
  relatedId?: string;
  relatedUserId?: string;
  relatedOrderId?: string;
  relatedProductId?: string;
  note?: string;
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
    relatedType: folder === 'payments' ? 'order' : 'user',
    relatedId,
  });

  if (onProgress) {
    onProgress(100);
  }

  return media.url;
};

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
