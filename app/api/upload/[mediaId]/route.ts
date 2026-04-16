import { NextResponse } from 'next/server';
import { access, unlink } from 'fs/promises';
import { constants as fsConstants } from 'fs';
import { adminDb } from '@/lib/server/firebase-admin';
import { requireAuth } from '@/lib/server/auth';
import { ApiError, jsonError } from '@/lib/server/http';
import { getAbsoluteFilePathFromStoragePath } from '@/lib/server/local-upload';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function canManageMedia(uid: string, email: string | undefined) {
  if (email === 'technicalhammad39@gmail.com') {
    return true;
  }

  const profile = await adminDb.collection('users').doc(uid).get();
  const role = String(profile.data()?.role || '').toLowerCase();
  return role === 'admin' || role === 'manager' || role === 'staff';
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

    const mediaRef = adminDb.collection('media_files').doc(mediaId);
    const mediaDoc = await mediaRef.get();

    if (!mediaDoc.exists) {
      throw new ApiError(404, 'Media record not found.');
    }

    const mediaData = mediaDoc.data() as {
      ownerId?: string;
      storagePath?: string;
      publicPath?: string;
      fileName?: string;
    };

    const isOwner = mediaData.ownerId && mediaData.ownerId === decoded.uid;
    const isStaff = await canManageMedia(decoded.uid, decoded.email);

    if (!isOwner && !isStaff) {
      throw new ApiError(403, 'You do not have permission to delete this file.');
    }

    let fileDeleted = false;
    const storagePath = mediaData.storagePath || '';

    if (storagePath) {
      const absolutePath = getAbsoluteFilePathFromStoragePath(storagePath);
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
    return jsonError(error);
  }
}
