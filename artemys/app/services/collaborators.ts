import { supabase } from '@/lib/supabase';
import { createNotification } from './notifications';
import type { CollaboratorWithProfile } from '@/types/database';

export async function addCollaborator(projectId: string, userId: string, role: string, projectOwnerId?: string) {
  const { error } = await supabase
    .from('collaborators')
    .insert({ project_id: projectId, user_id: userId, role });
  if (error) throw error;
  if (projectOwnerId) {
    createNotification({ userId, actorId: projectOwnerId, type: 'collaborator', projectId }).catch(() => {});
  }
}

export async function removeCollaborator(projectId: string, userId: string) {
  const { error } = await supabase
    .from('collaborators')
    .delete()
    .eq('project_id', projectId)
    .eq('user_id', userId);
  if (error) throw error;
}

export async function getProjectCollaborators(projectId: string): Promise<CollaboratorWithProfile[]> {
  const { data, error } = await supabase
    .from('collaborators')
    .select('*, profiles(*)')
    .eq('project_id', projectId);
  if (error) throw error;
  return (data ?? []) as CollaboratorWithProfile[];
}
