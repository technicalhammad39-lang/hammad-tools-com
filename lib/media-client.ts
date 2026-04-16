import { uploadMediaFile } from './storage-utils';

/**
 * Example client-side usage for uploading a payment screenshot.
 */
export async function uploadPaymentProofExample(file: File, orderId: string) {
  const media = await uploadMediaFile({
    file,
    folder: 'payments',
    relatedType: 'order',
    relatedId: orderId,
    relatedOrderId: orderId,
  });

  return {
    mediaId: media.id,
    fileUrl: media.url,
    fileName: media.fileName,
    mimeType: media.mimeType,
    sizeBytes: media.sizeBytes,
  };
}
