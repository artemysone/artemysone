import { supabase } from '@/lib/supabase';
import { createNotification } from './notifications';
import type { CommentWithProfile } from '@/types/database';

export async function getComments(projectId: string): Promise<CommentWithProfile[]> {
  const { data, error } = await supabase
    .from('comments')
    .select('*, profiles(*)')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as CommentWithProfile[];
}

export async function addComment(
  userId: string,
  projectId: string,
  text: string,
  projectOwnerId?: string,
): Promise<CommentWithProfile> {
  const { data, error } = await supabase
    .from('comments')
    .insert({ user_id: userId, project_id: projectId, text })
    .select('*, profiles(*)')
    .single();
  if (error) throw error;
  const comment = data as CommentWithProfile;
  if (projectOwnerId) {
    createNotification({ userId: projectOwnerId, actorId: userId, type: 'comment', projectId, commentId: comment.id }).catch(() => {});
  }
  return comment;
}

export async function deleteComment(commentId: string): Promise<void> {
  const { error } = await supabase.from('comments').delete().eq('id', commentId);
  if (error) throw error;
}
