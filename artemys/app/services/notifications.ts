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

export async function createNotification(params: {
  userId: string;
  actorId: string;
  type: 'like' | 'follow' | 'comment' | 'collaborator';
  projectId?: string;
  commentId?: string;
}): Promise<void> {
  if (params.userId === params.actorId) return;

  const { error } = await supabase.from('notifications').insert({
    user_id: params.userId,
    actor_id: params.actorId,
    type: params.type,
    project_id: params.projectId ?? null,
    comment_id: params.commentId ?? null,
  });
  if (error) throw error;
}
