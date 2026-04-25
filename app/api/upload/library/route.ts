import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/server/firebase-admin';
import { canManageUploads, requireAuth } from '@/lib/server/auth';
import { ApiError, jsonError } from '@/lib/server/http';
import {
  isUploadDebugEnabled,
  isUploadFolderStaffOnly,
  normalizeUploadFolder,
  type UploadFolder,
} from '@/lib/server/local-upload';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DEFAULT_LIMIT = 80;
const MAX_LIMIT = 200;
const MAX_SCAN_LIMIT = 600;

type MediaRecord = {
  id?: string;
  ownerId?: string;
  folder?: string;
  access?: string;
  fileName?: string;
  originalFileName?: string;
  mimeType?: string;
  sizeBytes?: number;
  storagePath?: string;
  publicPath?: string;
  protectedPath?: string;
  fileUrl?: string;
  relatedType?: string;
  relatedId?: string;
  relatedUserId?: string;
  relatedOrderId?: string;
  relatedProductId?: string;
  note?: string;
  createdAt?: any;
};

function sanitizeText(value: unknown, maxLength = 300) {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim().slice(0, maxLength);
}

function normalizeLimit(raw: string | null) {
  const parsed = Number(raw || '');
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_LIMIT;
  }
  return Math.max(1, Math.min(MAX_LIMIT, Math.floor(parsed)));
}

function toIsoDate(value: unknown) {
  if (!value) {
    return '';
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'object' && value && 'toDate' in value && typeof (value as any).toDate === 'function') {
    try {
      const converted = (value as any).toDate();
      if (converted instanceof Date) {
        return converted.toISOString();
      }
    } catch {
      return '';
    }
  }

  if (typeof value === 'string') {
    return value;
  }

  return '';
}

function normalizeRecordFolder(value: unknown, fallback: UploadFolder) {
  try {
    return normalizeUploadFolder(sanitizeText(value, 80));
  } catch {
    return fallback;
  }
}

function normalizeRecordAccess(value: unknown, folder: UploadFolder) {
  const candidate = sanitizeText(value, 40).toLowerCase();
  if (candidate === 'public' || candidate === 'protected') {
    return candidate;
  }
  return folder === 'payment-proofs' || folder === 'chat-attachments' ? 'protected' : 'public';
}

function toLibraryItem(docId: string, data: MediaRecord, fallbackFolder: UploadFolder) {
  const folder = normalizeRecordFolder(data.folder, fallbackFolder);
  const access = normalizeRecordAccess(data.access, folder);

  return {
    id: sanitizeText(data.id, 220) || docId,
    ownerId: sanitizeText(data.ownerId, 220),
    folder,
    access,
    fileName: sanitizeText(data.fileName, 260),
    originalFileName: sanitizeText(data.originalFileName, 260),
    mimeType: sanitizeText(data.mimeType, 160),
    sizeBytes: Number(data.sizeBytes || 0),
    storagePath: sanitizeText(data.storagePath, 600),
    publicPath: sanitizeText(data.publicPath, 400),
    url: sanitizeText(data.fileUrl || data.protectedPath || data.publicPath, 2000),
    relatedType: sanitizeText(data.relatedType, 120),
    relatedId: sanitizeText(data.relatedId, 220),
    relatedUserId: sanitizeText(data.relatedUserId, 220),
    relatedOrderId: sanitizeText(data.relatedOrderId, 220),
    relatedProductId: sanitizeText(data.relatedProductId, 220),
    note: sanitizeText(data.note, 260),
    createdAt: toIsoDate(data.createdAt),
  };
}

function containsSearch(item: ReturnType<typeof toLibraryItem>, query: string) {
  if (!query) {
    return true;
  }

  const needle = query.toLowerCase();
  const haystack = [
    item.fileName,
    item.originalFileName,
    item.mimeType,
    item.note,
    item.relatedType,
    item.relatedId,
    item.relatedOrderId,
    item.relatedProductId,
    item.ownerId,
  ]
    .join(' ')
    .toLowerCase();

  return haystack.includes(needle);
}

async function assertOrderAccess(orderId: string, uid: string, isStaff: boolean) {
  if (!orderId) {
    throw new ApiError(400, 'relatedOrderId is required for this media library request.');
  }

  if (isStaff) {
    return;
  }

  const orderRef = adminDb.collection('orders').doc(orderId);
  const orderSnap = await orderRef.get();
  if (!orderSnap.exists) {
    throw new ApiError(404, 'Order not found for this media request.');
  }

  const orderData = orderSnap.data() as Record<string, unknown>;
  const ownerId = String(orderData.userId || orderData.user_id || '');
  if (!ownerId || ownerId !== uid) {
    throw new ApiError(403, 'You do not have permission to access order media.');
  }
}

export async function GET(request: Request) {
  try {
    const decoded = await requireAuth(request);
    const isStaff = await canManageUploads(decoded.uid, decoded.email);
    const url = new URL(request.url);

    const requestedFolder = sanitizeText(url.searchParams.get('folder'), 80);
    if (!requestedFolder) {
      throw new ApiError(400, 'folder is required.');
    }

    const folder = normalizeUploadFolder(requestedFolder);
    if (isUploadFolderStaffOnly(folder) && !isStaff) {
      throw new ApiError(403, 'You do not have permission to access this media folder.');
    }

    const limit = normalizeLimit(url.searchParams.get('limit'));
    const search = sanitizeText(url.searchParams.get('q'), 120);
    const relatedType = sanitizeText(url.searchParams.get('relatedType'), 120);
    const relatedId = sanitizeText(url.searchParams.get('relatedId'), 220);
    const relatedUserId = sanitizeText(url.searchParams.get('relatedUserId'), 220);
    const relatedOrderId = sanitizeText(url.searchParams.get('relatedOrderId'), 220);
    const relatedProductId = sanitizeText(url.searchParams.get('relatedProductId'), 220);

    if (folder === 'chat-attachments') {
      await assertOrderAccess(relatedOrderId, decoded.uid, isStaff);
    }

    if (folder === 'payment-proofs' && !isStaff) {
      await assertOrderAccess(relatedOrderId, decoded.uid, isStaff);
    }

    const scanLimit = Math.max(
      limit * 4,
      folder === 'chat-attachments' || folder === 'payment-proofs' ? 300 : 220
    );
    const cappedScanLimit = Math.min(MAX_SCAN_LIMIT, scanLimit);

    const snapshot = await adminDb
      .collection('media_files')
      .orderBy('createdAt', 'desc')
      .limit(cappedScanLimit)
      .get();

    const items: Array<ReturnType<typeof toLibraryItem>> = [];

    snapshot.docs.forEach((docSnap) => {
      if (items.length >= limit) {
        return;
      }

      const data = docSnap.data() as MediaRecord;
      const item = toLibraryItem(docSnap.id, data, folder);

      if (item.folder !== folder) {
        return;
      }

      if (!item.url || !item.fileName || !item.storagePath) {
        return;
      }

      if (!isStaff && item.ownerId !== decoded.uid) {
        return;
      }

      if (relatedType && item.relatedType !== relatedType) {
        return;
      }
      if (relatedId && item.relatedId !== relatedId) {
        return;
      }
      if (relatedUserId && item.relatedUserId !== relatedUserId) {
        return;
      }
      if (relatedOrderId && item.relatedOrderId !== relatedOrderId) {
        return;
      }
      if (relatedProductId && item.relatedProductId !== relatedProductId) {
        return;
      }

      if (!containsSearch(item, search)) {
        return;
      }

      items.push(item);
    });

    return NextResponse.json({
      success: true,
      items,
      total: items.length,
    });
  } catch (error) {
    if (isUploadDebugEnabled()) {
      console.error('[upload:library] failed', error);
    }
    return jsonError(error);
  }
}
