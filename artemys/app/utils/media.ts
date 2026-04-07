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
