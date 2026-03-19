/**
 * Uploads a file to the local Server Storage and returns the public URL.
 * @param file The file to upload.
 * @param path Unused in local storage but kept for compatibility (e.g., 'services/image.jpg').
 * @param onProgress Optional callback for upload progress (simulated for local).
 */
export const uploadFile = async (
  file: File,
  _path: string,
  onProgress?: (progress: number) => void
): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);

  // Use XMLHttpRequest for progress tracking
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        const progress = Math.round((event.loaded / event.total) * 100);
        onProgress(progress);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const response = JSON.parse(xhr.responseText);
        resolve(response.url);
      } else {
        reject(new Error('Upload failed'));
      }
    });

    xhr.addEventListener('error', () => reject(new Error('Upload failed')));
    
    xhr.open('POST', '/api/upload');
    xhr.send(formData);
  });
};
