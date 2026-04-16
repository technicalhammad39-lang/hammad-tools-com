import { NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { adminDb, adminFieldValue } from '@/lib/server/firebase-admin';
import { requireAuth } from '@/lib/server/auth';
import { ApiError, jsonError } from '@/lib/server/http';
import {
  ensureUploadFolder,
  generateUniqueFileName,
  getPublicFilePath,
  getRelativeStoragePath,
  normalizeOptionalText,
  normalizeUploadFolder,
  toPublicUrl,
  validateUploadFile,
} from '@/lib/server/local-upload';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const decoded = await requireAuth(request);
    const formData = await request.formData();

    const incomingFile = formData.get('file');
    if (!(incomingFile instanceof File)) {
      throw new ApiError(400, 'No file uploaded.');
    }

    const folder = normalizeUploadFolder(normalizeOptionalText(formData.get('folder')));
    const extension = validateUploadFile(incomingFile);
    const fileName = generateUniqueFileName(incomingFile.name, extension);
    const folderPath = await ensureUploadFolder(folder);

    const bytes = await incomingFile.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const absoluteFilePath = join(folderPath, fileName);
    await writeFile(absoluteFilePath, buffer, { flag: 'wx' });

    const storagePath = getRelativeStoragePath(folder, fileName);
    const publicPath = getPublicFilePath(folder, fileName);
    const publicUrl = toPublicUrl(request, publicPath);

    const mediaRef = adminDb.collection('media_files').doc();
    const mediaRecord = {
      id: mediaRef.id,
      ownerId: decoded.uid,
      ownerEmail: decoded.email || '',
      folder,
      source: 'local-hosting',
      fileName,
      originalFileName: incomingFile.name,
      extension,
      mimeType: incomingFile.type || 'application/octet-stream',
      sizeBytes: incomingFile.size,
      storagePath,
      publicPath,
      publicUrl,
      relatedType: normalizeOptionalText(formData.get('relatedType')) || '',
      relatedId: normalizeOptionalText(formData.get('relatedId')) || '',
      relatedUserId: normalizeOptionalText(formData.get('relatedUserId')) || '',
      relatedOrderId: normalizeOptionalText(formData.get('relatedOrderId')) || '',
      relatedProductId: normalizeOptionalText(formData.get('relatedProductId')) || '',
      note: normalizeOptionalText(formData.get('note')) || '',
      createdAt: adminFieldValue.serverTimestamp(),
      updatedAt: adminFieldValue.serverTimestamp(),
    };

    await mediaRef.set(mediaRecord);

    return NextResponse.json({
      success: true,
      media: {
        id: mediaRef.id,
        url: publicUrl,
        publicPath,
        storagePath,
        fileName,
        mimeType: mediaRecord.mimeType,
        sizeBytes: incomingFile.size,
        folder,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
