import { supabase } from '@/lib/supabase';
import type { FeedItem } from '@/types/database';

const PAGE_SIZE = 10;

export async function getFeed(userId: string, page = 0): Promise<FeedItem[]> {
  // Get IDs of users we follow
  const { data: followRows } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', userId);

  const followingIds = (followRows ?? []).map((r) => r.following_id);

  if (followingIds.length === 0) return [];

  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data, error } = await supabase
    .from('projects')
    .select(`
      *,
      profiles!projects_user_id_fkey(*),
      project_tags(tags(*)),
      collaborators(*, profiles(*))
    `)
    .in('user_id', followingIds)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) throw error;
  if (!data) return [];

  // Enrich with like/comment counts and user state
  const enriched = await Promise.all(
    data.map(async (project) => {
      const [likes, comments, userLike] = await Promise.all([
        supabase.from('likes').select('user_id', { count: 'exact', head: true }).eq('project_id', project.id),
        supabase.from('comments').select('id', { count: 'exact', head: true }).eq('project_id', project.id),
        supabase.from('likes').select('user_id').eq('project_id', project.id).eq('user_id', userId).maybeSingle(),
      ]);

      return {
        ...project,
        like_count: likes.count ?? 0,
        comment_count: comments.count ?? 0,
        user_has_liked: !!userLike.data,
        user_is_following: true, // All feed items are from followed users
      } as FeedItem;
    })
  );

  return enriched;
}

export async function getDiscoverFeed(userId: string, page = 0): Promise<FeedItem[]> {
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data, error } = await supabase
    .from('projects')
    .select(`
      *,
      profiles!projects_user_id_fkey(*),
      project_tags(tags(*)),
      collaborators(*, profiles(*))
    `)
    .neq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) throw error;
  if (!data) return [];

  // Get follow status for each project's author
  const authorIds = [...new Set(data.map((p) => p.user_id))];
  const { data: followRows } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', userId)
    .in('following_id', authorIds);
  const followingSet = new Set((followRows ?? []).map((r) => r.following_id));

  const enriched = await Promise.all(
    data.map(async (project) => {
      const [likes, comments, userLike] = await Promise.all([
        supabase.from('likes').select('user_id', { count: 'exact', head: true }).eq('project_id', project.id),
        supabase.from('comments').select('id', { count: 'exact', head: true }).eq('project_id', project.id),
        supabase.from('likes').select('user_id').eq('project_id', project.id).eq('user_id', userId).maybeSingle(),
      ]);

      return {
        ...project,
        like_count: likes.count ?? 0,
        comment_count: comments.count ?? 0,
        user_has_liked: !!userLike.data,
        user_is_following: followingSet.has(project.user_id),
      } as FeedItem;
    })
  );

  return enriched;
}

export async function toggleLike(userId: string, projectId: string): Promise<boolean> {
  // Check if already liked
  const { data: existing } = await supabase
    .from('likes')
    .select('user_id')
    .eq('user_id', userId)
    .eq('project_id', projectId)
    .maybeSingle();

  if (existing) {
    await supabase.from('likes').delete().eq('user_id', userId).eq('project_id', projectId);
    return false; // unliked
  } else {
    await supabase.from('likes').insert({ user_id: userId, project_id: projectId });
    return true; // liked
  }
}

export async function toggleFollow(followerId: string, followingId: string): Promise<boolean> {
  const { data: existing } = await supabase
    .from('follows')
    .select('follower_id')
    .eq('follower_id', followerId)
    .eq('following_id', followingId)
    .maybeSingle();

  if (existing) {
    await supabase.from('follows').delete().eq('follower_id', followerId).eq('following_id', followingId);
    return false; // unfollowed
  } else {
    await supabase.from('follows').insert({ follower_id: followerId, following_id: followingId });
    return true; // followed
  }
}

export async function getFollowStatus(followerId: string, followingId: string): Promise<boolean> {
  const { data } = await supabase
    .from('follows')
    .select('follower_id')
    .eq('follower_id', followerId)
    .eq('following_id', followingId)
    .maybeSingle();
  return !!data;
}
