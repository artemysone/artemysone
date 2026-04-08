import { supabase } from '@/lib/supabase';
import type { ProjectMedia } from '@/types/database';

export async function getProjectMedia(projectId: string): Promise<ProjectMedia[]> {
  const { data, error } = await supabase
    .from('project_media')
    .select('*')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []) as ProjectMedia[];
}

export async function addProjectMedia(
  projectId: string,
  items: {
    mediaUrl: string;
    mediaType: 'image' | 'video';
    thumbnailUrl?: string;
    sortOrder: number;
  }[],
): Promise<void> {
  if (items.length === 0) return;

  const rows = items.map((item) => ({
    project_id: projectId,
    media_url: item.mediaUrl,
    media_type: item.mediaType,
    thumbnail_url: item.thumbnailUrl ?? null,
    sort_order: item.sortOrder,
  }));

  const { error } = await supabase.from('project_media').insert(rows);
  if (error) throw error;
}

export async function deleteProjectMedia(mediaId: string): Promise<void> {
  const { error } = await supabase
    .from('project_media')
    .delete()
    .eq('id', mediaId);
  if (error) throw error;
}
