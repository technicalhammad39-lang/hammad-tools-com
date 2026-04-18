import { NextResponse } from 'next/server';
import { access, readFile, unlink } from 'fs/promises';
import { constants as fsConstants } from 'fs';
import { adminDb } from '@/lib/server/firebase-admin';
import { canManageUploads, requireAuth } from '@/lib/server/auth';
import { ApiError, jsonError } from '@/lib/server/http';
import {
  getAbsoluteFilePathFromStoragePath,
  isUploadDebugEnabled,
  normalizeUploadFolder,
  resolveAccessForMedia,
} from '@/lib/server/local-upload';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type MediaRecord = {
  ownerId?: string;
  storagePath?: string;
  access?: string;
  folder?: string;
  fileName?: string;
  mimeType?: string;
  relatedOrderId?: string;
};

async function canAccessOrderMedia(orderId: string, uid: string, isStaff: boolean) {
  if (isStaff) {
    return true;
  }

  if (!orderId) {
    return false;
  }

  const orderSnap = await adminDb.collection('orders').doc(orderId).get();
  if (!orderSnap.exists) {
    return false;
  }

  const order = orderSnap.data() as Record<string, unknown>;
  return String(order.userId || order.user_id || '') === uid;
}

async function resolveMedia(mediaId: string) {
  const mediaRef = adminDb.collection('media_files').doc(mediaId);
  const mediaDoc = await mediaRef.get();

  if (!mediaDoc.exists) {
    throw new ApiError(404, 'Media record not found.');
  }

  const mediaData = mediaDoc.data() as MediaRecord;
  return { mediaRef, mediaData };
}

export async function GET(
  request: Request,
  context: { params: Promise<{ mediaId: string }> }
) {
  try {
    const { mediaId } = await context.params;
    if (!mediaId) {
      throw new ApiError(400, 'mediaId is required.');
    }

    const { mediaData } = await resolveMedia(mediaId);
    const folder = normalizeUploadFolder(mediaData.folder || 'tools');
    const accessType = resolveAccessForMedia({
      access: mediaData.access,
      folder,
    });

    if (accessType === 'protected') {
      const decoded = await requireAuth(request, { allowQueryToken: true });
      const isStaff = await canManageUploads(decoded.uid, decoded.email);
      const isOwner = mediaData.ownerId === decoded.uid;
      const canAccessByOrder = await canAccessOrderMedia(
        mediaData.relatedOrderId || '',
        decoded.uid,
        isStaff
      );

      if (!isOwner && !isStaff && !canAccessByOrder) {
        throw new ApiError(403, 'You do not have permission to access this file.');
      }
    }

    const storagePath = mediaData.storagePath || '';
    if (!storagePath) {
      throw new ApiError(404, 'Media file path missing.');
    }

    const absolutePath = getAbsoluteFilePathFromStoragePath(storagePath, accessType);
    let fileBuffer: Buffer;
    try {
      await access(absolutePath, fsConstants.F_OK);
      fileBuffer = await readFile(absolutePath);
    } catch (error: any) {
      if (error?.code === 'ENOENT') {
        throw new ApiError(404, 'File not found on server.');
      }
      throw error;
    }

    const mimeType = mediaData.mimeType || 'application/octet-stream';
    const fileName = mediaData.fileName || 'file';
    const url = new URL(request.url);
    const asAttachment = url.searchParams.get('download') === '1';

    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Length': String(fileBuffer.byteLength),
        'Cache-Control': accessType === 'public' ? 'public, max-age=86400' : 'private, max-age=0, no-store',
        'Content-Disposition': `${asAttachment ? 'attachment' : 'inline'}; filename="${fileName}"`,
      },
    });
  } catch (error) {
    if (isUploadDebugEnabled()) {
      console.error('[upload:file:get] failed', error);
    }
    return jsonError(error);
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ mediaId: string }> }
) {
  try {
    const decoded = await requireAuth(request);
    const { mediaId } = await context.params;

    if (!mediaId) {
      throw new ApiError(400, 'mediaId is required.');
    }

    const isStaff = await canManageUploads(decoded.uid, decoded.email);
    const { mediaRef, mediaData } = await resolveMedia(mediaId);

    const isOwner = mediaData.ownerId && mediaData.ownerId === decoded.uid;
    if (!isOwner && !isStaff) {
      throw new ApiError(403, 'You do not have permission to delete this file.');
    }

    let fileDeleted = false;
    const storagePath = mediaData.storagePath || '';

    if (storagePath) {
      const accessType = resolveAccessForMedia({
        access: mediaData.access,
        folder: mediaData.folder,
      });

      const absolutePath = getAbsoluteFilePathFromStoragePath(storagePath, accessType);
      try {
        await access(absolutePath, fsConstants.F_OK);
        await unlink(absolutePath);
        fileDeleted = true;
      } catch (error: any) {
        if (error?.code !== 'ENOENT') {
          throw error;
        }
      }
    }

    await mediaRef.delete();

    return NextResponse.json({
      success: true,
      deleted: {
        id: mediaId,
        fileDeleted,
      },
    });
  } catch (error) {
    if (isUploadDebugEnabled()) {
      console.error('[upload:file:delete] failed', error);
    }
    return jsonError(error);
  }
}
