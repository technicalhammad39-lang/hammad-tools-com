import { NextResponse } from 'next/server';
import { writeFile, access, unlink } from 'fs/promises';
import { constants as fsConstants } from 'fs';
import { join } from 'path';
import { adminDb, adminFieldValue } from '@/lib/server/firebase-admin';
import { canManageUploads, requireAuth } from '@/lib/server/auth';
import { ApiError, jsonError } from '@/lib/server/http';
import {
  ensureUploadFolder,
  generateUniqueFileName,
  getAbsoluteFilePathFromStoragePath,
  getFolderAccess,
  getProtectedMediaPath,
  getPublicFilePath,
  getRelativeStoragePath,
  isUploadFolderStaffOnly,
  normalizeOptionalText,
  normalizeUploadFolder,
  resolveAccessForMedia,
  toPublicUrl,
  validateUploadFile,
} from '@/lib/server/local-upload';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type ExistingMediaCandidate = {
  ref: any;
  data: {
    ownerId?: string;
    storagePath?: string;
    access?: string;
    folder?: string;
  };
};

async function assertOrderAccess(orderId: string, uid: string, isStaff: boolean) {
  const orderRef = adminDb.collection('orders').doc(orderId);
  const orderSnap = await orderRef.get();

  if (!orderSnap.exists) {
    if (!isStaff) {
      throw new ApiError(400, 'Related order not found for this upload.');
    }
    return;
  }

  const orderData = orderSnap.data() as Record<string, unknown>;
  const orderOwner = String(orderData.userId || '');
  if (!isStaff && orderOwner !== uid) {
    throw new ApiError(403, 'You do not have permission to upload files for this order.');
  }
}

async function resolveReplaceCandidate(
  mediaId: string,
  uid: string,
  isStaff: boolean
): Promise<ExistingMediaCandidate | null> {
  const normalized = mediaId.trim();
  if (!normalized) {
    return null;
  }

  const ref = adminDb.collection('media_files').doc(normalized);
  const snap = await ref.get();
  if (!snap.exists) {
    return null;
  }

  const data = snap.data() as ExistingMediaCandidate['data'];
  const isOwner = data.ownerId === uid;
  if (!isOwner && !isStaff) {
    throw new ApiError(403, 'You do not have permission to replace this media file.');
  }

  return { ref, data };
}

async function deleteMediaFileAndRecord(candidate: ExistingMediaCandidate) {
  const storagePath = candidate.data.storagePath || '';
  if (storagePath) {
    try {
      const accessType = resolveAccessForMedia({
        access: candidate.data.access,
        folder: candidate.data.folder,
      });
      const absolutePath = getAbsoluteFilePathFromStoragePath(storagePath, accessType);
      await access(absolutePath, fsConstants.F_OK);
      await unlink(absolutePath);
    } catch (error: any) {
      if (error?.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  await candidate.ref.delete();
}

export async function POST(request: Request) {
  try {
    const decoded = await requireAuth(request);
    const isStaff = await canManageUploads(decoded.uid, decoded.email);
    const formData = await request.formData();

    const incomingFile = formData.get('file');
    if (!(incomingFile instanceof File)) {
      throw new ApiError(400, 'No file uploaded.');
    }

    const folder = normalizeUploadFolder(normalizeOptionalText(formData.get('folder')));
    const folderAccess = getFolderAccess(folder);

    if (isUploadFolderStaffOnly(folder) && !isStaff) {
      throw new ApiError(403, 'You do not have permission to upload this type of file.');
    }

    const relatedOrderId = normalizeOptionalText(formData.get('relatedOrderId'));
    const relatedUserId = normalizeOptionalText(formData.get('relatedUserId'));

    if (folder === 'payment-proofs') {
      if (relatedOrderId) {
        await assertOrderAccess(relatedOrderId, decoded.uid, isStaff);
      }
    }

    if (folder === 'chat-attachments') {
      if (!relatedOrderId) {
        throw new ApiError(400, 'relatedOrderId is required for chat attachments.');
      }
      await assertOrderAccess(relatedOrderId, decoded.uid, isStaff);
    }

    if (folder === 'profiles' && relatedUserId && relatedUserId !== decoded.uid && !isStaff) {
      throw new ApiError(403, 'You do not have permission to upload files for this profile.');
    }

    const replaceMediaId = normalizeOptionalText(formData.get('replaceMediaId'));
    const replaceCandidate = replaceMediaId
      ? await resolveReplaceCandidate(replaceMediaId, decoded.uid, isStaff)
      : null;

    const validation = validateUploadFile(incomingFile, folder);
    const fileName = generateUniqueFileName(incomingFile.name, validation.extension);
    const folderPath = await ensureUploadFolder(folder, folderAccess);

    const mediaRef = adminDb.collection('media_files').doc();

    const bytes = await incomingFile.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const absoluteFilePath = join(folderPath, fileName);
    await writeFile(absoluteFilePath, buffer, { flag: 'wx' });

    const storagePath = getRelativeStoragePath(folder, fileName);
    const publicPath = folderAccess === 'public' ? getPublicFilePath(folder, fileName) : '';
    const protectedPath = folderAccess === 'protected' ? getProtectedMediaPath(mediaRef.id) : '';
    const filePath = folderAccess === 'public' ? publicPath : protectedPath;
    const fileUrl = toPublicUrl(request, filePath);

    const mediaRecord = {
      id: mediaRef.id,
      ownerId: decoded.uid,
      ownerEmail: decoded.email || '',
      folder,
      access: folderAccess,
      source: 'hostinger-filesystem',
      fileName,
      originalFileName: incomingFile.name,
      extension: validation.extension,
      mimeType: validation.mimeType,
      sizeBytes: incomingFile.size,
      storagePath,
      publicPath,
      protectedPath,
      fileUrl,
      relatedType: normalizeOptionalText(formData.get('relatedType')) || '',
      relatedId: normalizeOptionalText(formData.get('relatedId')) || '',
      relatedUserId,
      relatedOrderId,
      relatedProductId: normalizeOptionalText(formData.get('relatedProductId')) || '',
      note: normalizeOptionalText(formData.get('note')) || '',
      createdAt: adminFieldValue.serverTimestamp(),
      updatedAt: adminFieldValue.serverTimestamp(),
    };

    await mediaRef.set(mediaRecord);

    if (replaceCandidate && replaceCandidate.ref.id !== mediaRef.id) {
      await deleteMediaFileAndRecord(replaceCandidate);
    }

    return NextResponse.json({
      success: true,
      media: {
        id: mediaRef.id,
        url: fileUrl,
        publicPath,
        storagePath,
        fileName,
        mimeType: mediaRecord.mimeType,
        sizeBytes: incomingFile.size,
        folder,
        access: folderAccess,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}