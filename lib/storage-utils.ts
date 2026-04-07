import { storage } from '@/firebase';
import { getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';

function sanitizePath(path: string) {
  return path
    .replace(/\\/g, '/')
    .replace(/\/+/g, '/')
    .replace(/^\//, '')
    .replace(/[^a-zA-Z0-9/_.-]/g, '-');
}

/**
 * Uploads a file to Firebase Storage and returns a public download URL.
 */
export const uploadFile = async (
  file: File,
  path: string,
  onProgress?: (progress: number) => void
): Promise<string> => {
  const safePath = sanitizePath(path);
  const storageRef = ref(storage, safePath);
  const uploadTask = uploadBytesResumable(storageRef, file, {
    contentType: file.type || 'application/octet-stream',
  });

  return new Promise((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        if (!onProgress) {
          return;
        }
        const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
        onProgress(progress);
      },
      (error) => reject(error),
      async () => {
        try {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadUrl);
        } catch (error) {
          reject(error);
        }
      }
    );
  });
};

