import { supabase } from '@/lib/supabase';
import type { ProjectBumpType, ProjectUpdateWithProfile } from '@/types/database';

function isMissingProjectUpdatesTable(error: unknown): boolean {
  return (
    typeof error === 'object'
    && error !== null
    && 'code' in error
    && (error as { code?: string }).code === 'PGRST205'
  );
}

export async function getProjectUpdates(projectId: string): Promise<ProjectUpdateWithProfile[]> {
  const { data, error } = await supabase
    .from('project_updates')
    .select(`
      *,
      profiles!project_updates_user_id_fkey(*)
    `)
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });
  if (error) {
    if (isMissingProjectUpdatesTable(error)) {
      return [];
    }
    throw error;
  }
  return (data ?? []) as ProjectUpdateWithProfile[];
}

export interface CreateProjectUpdateInput {
  userId: string;
  projectId: string;
  body: string;
  bumpType: ProjectBumpType;
}

export async function createProjectUpdate(
  input: CreateProjectUpdateInput,
): Promise<ProjectUpdateWithProfile> {
  const trimmedBody = input.body.trim();
  if (!trimmedBody) {
    throw new Error('Project update body cannot be blank.');
  }

  const { data, error } = await supabase
    .from('project_updates')
    .insert({
      user_id: input.userId,
      project_id: input.projectId,
      body: trimmedBody,
      bump_type: input.bumpType,
    })
    .select(`
      *,
      profiles!project_updates_user_id_fkey(*)
    `)
    .maybeSingle();
  if (error) {
    if (isMissingProjectUpdatesTable(error)) {
      throw new Error('Project updates are not available until the latest database migration is applied.');
    }
    throw error;
  }
  if (!data) throw new Error('Project update creation returned no data.');
  return data as ProjectUpdateWithProfile;
}
