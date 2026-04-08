import { supabase } from '@/lib/supabase';
import type { Profile, Project } from '@/types/database';

const MAX_SEARCH_RESULTS = 50;

export interface SearchResults {
  profiles: Profile[];
  projects: Project[];
}

export async function searchAll(query: string, limit = 10): Promise<SearchResults> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return { profiles: [], projects: [] };

  const safeLimit = Math.min(Math.max(limit, 1), MAX_SEARCH_RESULTS);

  const [profilesRes, projectsRes] = await Promise.all([
    supabase.rpc('search_profiles', { p_query: trimmed, p_limit: safeLimit }),
    supabase.rpc('search_projects', { p_query: trimmed, p_limit: safeLimit }),
  ]);

  if (profilesRes.error) throw profilesRes.error;
  if (projectsRes.error) throw projectsRes.error;

  return {
    profiles: (profilesRes.data ?? []) as Profile[],
    projects: (projectsRes.data ?? []) as Project[],
  };
}

export async function getProjectsByTag(
  tagId: string,
  page = 0,
  limit = 20,
): Promise<Project[]> {
  const { data, error } = await supabase.rpc('get_projects_by_tag', {
    p_tag_id: tagId,
    p_limit: limit,
    p_offset: page * limit,
  });
  if (error) throw error;
  return (data ?? []) as Project[];
}
