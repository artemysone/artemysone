import { supabase } from '@/lib/supabase';
import type { Profile, Project } from '@/types/database';

export interface ExploreProject extends Project {
  profiles: Profile;
}

const SELECT = '*, profiles!projects_user_id_fkey(*)';

export async function getExploreProjects(limit = 8): Promise<ExploreProject[]> {
  const { data, error } = await supabase
    .from('projects')
    .select(SELECT)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as ExploreProject[];
}

export async function getProjectsByCategory(
  tagId: string,
  limit = 20,
): Promise<ExploreProject[]> {
  const { data, error } = await supabase
    .from('projects')
    .select(`${SELECT}, project_tags!inner(tag_id)`)
    .eq('project_tags.tag_id', tagId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as ExploreProject[];
}
