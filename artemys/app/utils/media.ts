const MIME_BY_EXTENSION: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  heic: 'image/heic',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  m4v: 'video/x-m4v',
};

export function getFileExtension(uri: string, fallback: string): string {
  const cleanUri = uri.split('?')[0];
  const extension = cleanUri.split('.').pop()?.toLowerCase();
  return extension && /^[a-z0-9]+$/.test(extension) ? extension : fallback;
}

export function getMediaContentType(
  mediaType: 'image' | 'video',
  extension: string,
): string {
  const fallbackType = mediaType === 'video' ? 'video/mp4' : 'image/jpeg';
  return MIME_BY_EXTENSION[extension] ?? fallbackType;
}

export async function readUriAsBlob(
  uri: string,
  errorMessage: string,
): Promise<Blob> {
  const response = await fetch(uri);
  if (!response.ok) throw new Error(errorMessage);
  return response.blob();
}

/**
 * Extract the first frame of a video as a JPEG blob (web only).
 * Returns null if extraction fails.
 */
export function extractVideoThumbnailWeb(videoUri: string): Promise<Blob | null> {
  return new Promise((resolve) => {
    let resolved = false;
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.preload = 'auto';
    video.playsInline = true;

    const done = (result: Blob | null) => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timer);
      video.onloadeddata = null;
      video.onseeked = null;
      video.onerror = null;
      video.removeAttribute('src');
      video.load();
      resolve(result);
    };

    video.onloadeddata = () => { video.currentTime = 0.1; };

    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) { done(null); return; }
        ctx.drawImage(video, 0, 0);
        canvas.toBlob(
          (blob) => done(blob),
          'image/jpeg',
          0.8,
        );
      } catch {
        done(null);
      }
    };

    video.onerror = () => done(null);

    const timer = setTimeout(() => done(null), 10000);

    video.src = videoUri;
  });
}
