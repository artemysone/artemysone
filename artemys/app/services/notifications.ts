import { supabase } from '@/lib/supabase';
import type { NotificationWithActor } from '@/types/database';

const PAGE_SIZE = 20;

export async function getNotifications(
  userId: string,
  page = 0,
): Promise<NotificationWithActor[]> {
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data, error } = await supabase
    .from('notifications')
    .select(
      '*, profiles!notifications_actor_id_fkey(id, name, handle, avatar_url), projects!notifications_project_id_fkey(id, title, thumbnail_url)',
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(from, to);
  if (error) throw error;
  return (data ?? []) as NotificationWithActor[];
}

export async function getUnreadCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('read', false);
  if (error) throw error;
  return count ?? 0;
}

export async function markAsRead(notificationId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId);
  if (error) throw error;
}

export async function markAllAsRead(userId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false);
  if (error) throw error;
}

export async function createLikeNotification(projectId: string): Promise<void> {
  const { error } = await supabase.rpc('create_like_notification', {
    p_project_id: projectId,
  });
  if (error) throw error;
}

export async function createFollowNotification(followingId: string): Promise<void> {
  const { error } = await supabase.rpc('create_follow_notification', {
    p_following_id: followingId,
  });
  if (error) throw error;
}

export async function createCommentNotification(commentId: string): Promise<void> {
  const { error } = await supabase.rpc('create_comment_notification', {
    p_comment_id: commentId,
  });
  if (error) throw error;
}

export async function createCollaboratorNotification(
  projectId: string,
  userId: string,
): Promise<void> {
  const { error } = await supabase.rpc('create_collaborator_notification', {
    p_project_id: projectId,
    p_user_id: userId,
  });
  if (error) throw error;
}
