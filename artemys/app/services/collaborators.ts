import { supabase } from '@/lib/supabase';
import { createCollaboratorNotification } from './notifications';
import type { CollaboratorStatus, CollaboratorWithProfile } from '@/types/database';

export async function addCollaborator(
  projectId: string,
  userId: string,
  role: string,
  status: CollaboratorStatus = 'pending',
) {
  const { data: authUser } = await supabase.auth.getUser();
  const { error } = await supabase
    .from('collaborators')
    .insert({
      project_id: projectId,
      user_id: userId,
      role,
      status,
      invited_by: authUser.user?.id ?? null,
      responded_at: null,
    });
  if (error) throw error;
  createCollaboratorNotification(projectId, userId).catch(() => {});
}

export async function removeCollaborator(projectId: string, userId: string) {
  const { error } = await supabase
    .from('collaborators')
    .delete()
    .eq('project_id', projectId)
    .eq('user_id', userId);
  if (error) throw error;
}

export async function updateCollaboratorStatus(
  projectId: string,
  userId: string,
  status: CollaboratorStatus,
) {
  const { error } = await supabase.rpc('set_collaborator_status', {
    p_project_id: projectId,
    p_user_id: userId,
    p_status: status,
  });
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
