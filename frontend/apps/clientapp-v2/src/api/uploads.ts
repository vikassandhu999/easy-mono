import {clientApi} from '@/api/generated';

export type {ClientUpload, ClientUploadRequest} from '@/api/generated';

export const {useCreateClientUploadMutation} = clientApi;

export function putFileToSignedUrl(
  url: string,
  file: File,
  headers: Record<string, string>,
  onProgress: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('PUT', url);

    for (const [name, value] of Object.entries(headers)) {
      request.setRequestHeader(name, value);
    }

    request.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    });
    request.addEventListener('load', () => {
      if (request.status >= 200 && request.status < 300) {
        onProgress(100);
        resolve();
      } else {
        reject(new Error(`Upload failed with status ${request.status}`));
      }
    });
    request.addEventListener('error', () => reject(new Error('Upload failed')));
    request.addEventListener('abort', () => reject(new Error('Upload cancelled')));
    request.send(file);
  });
}
