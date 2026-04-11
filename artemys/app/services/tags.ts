import { supabase } from '@/lib/supabase';
import type { Tag } from '@/types/database';

export async function getTags(): Promise<Tag[]> {
  const { data, error } = await supabase.from('tags').select('*');
  if (error) throw error;
  return (data ?? []) as Tag[];
}

export async function replaceProjectTags(projectId: string, tagIds: string[]): Promise<void> {
  const { error: deleteError } = await supabase
    .from('project_tags')
    .delete()
    .eq('project_id', projectId);
  if (deleteError) throw deleteError;

  if (tagIds.length === 0) return;

  const { error: insertError } = await supabase
    .from('project_tags')
    .insert(tagIds.map((tagId) => ({ project_id: projectId, tag_id: tagId })));
  if (insertError) throw insertError;
}
