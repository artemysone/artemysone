import { readFileSync } from 'node:fs';
import { extname } from 'node:path';
import { supabase } from './supabase.js';
import { error } from './output.js';
import type { Tag } from './types.js';

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

const VIDEO_EXTENSIONS = new Set(['mp4', 'mov', 'm4v']);

function getContentType(ext: string, mediaType: 'image' | 'video'): string {
  return MIME_BY_EXTENSION[ext] ?? (mediaType === 'video' ? 'video/mp4' : 'image/jpeg');
}

export function normalizeTechStack(raw: string): string[] {
  return Array.from(
    new Set(
      raw
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0),
    ),
  );
}

export async function resolveTagNames(names: string): Promise<string[]> {
  const requested = names
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 0);

  if (requested.length === 0) return [];

  const { data, error: fetchError } = await supabase
    .from('tags')
    .select('id, name');
  if (fetchError) {
    error(`Failed to fetch tags: ${fetchError.message}`);
    process.exit(1);
  }

  const allTags = (data ?? []) as Tag[];
  const tagMap = new Map(allTags.map((t) => [t.name.toLowerCase(), t.id]));

  const ids: string[] = [];
  for (const name of requested) {
    const id = tagMap.get(name);
    if (!id) {
      error(`Unknown tag: "${name}". Run 'artemys tags' to see available tags.`);
      process.exit(1);
    }
    ids.push(id);
  }

  return ids;
}

export async function uploadMedia(
  userId: string,
  projectId: string,
  filePath: string,
): Promise<{ publicUrl: string; mediaType: 'image' | 'video' }> {
  const ext = extname(filePath).slice(1).toLowerCase() || 'jpg';
  const isVideo = VIDEO_EXTENSIONS.has(ext);
  const mediaType = isVideo ? ('video' as const) : ('image' as const);
  const contentType = getContentType(ext, mediaType);
  const storagePath = `${userId}/${projectId}/primary.${ext}`;

  let buffer: Buffer;
  try {
    buffer = readFileSync(filePath);
  } catch {
    error(`Could not read file: ${filePath}`);
    process.exit(1);
  }

  const { error: uploadError } = await supabase.storage
    .from('project-media')
    .upload(storagePath, buffer, { upsert: true, contentType });

  if (uploadError) {
    error(`Media upload failed: ${uploadError.message}`);
    process.exit(1);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from('project-media').getPublicUrl(storagePath);

  return { publicUrl, mediaType };
}
