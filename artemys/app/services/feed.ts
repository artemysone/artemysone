import { supabase } from '@/lib/supabase';
import type { FeedItem } from '@/types/database';

const PAGE_SIZE = 10;

const PROJECT_SELECT = `
  *,
  profiles!projects_user_id_fkey(*),
  project_tags(tags(*)),
  collaborators(*, profiles(*))
`;

async function enrichProjects(
  projects: any[],
  userId: string,
  followingStatus: (authorId: string) => boolean,
): Promise<FeedItem[]> {
  if (projects.length === 0) return [];

  const projectIds = projects.map((p) => p.id);

  const [likeCounts, commentCounts, userLikes] = await Promise.all([
    supabase.from('likes').select('project_id', { count: 'exact' }).in('project_id', projectIds),
    supabase.from('comments').select('project_id', { count: 'exact' }).in('project_id', projectIds),
    supabase.from('likes').select('project_id').eq('user_id', userId).in('project_id', projectIds),
  ]);

  const likeMap = new Map<string, number>();
  const commentMap = new Map<string, number>();
  const userLikedSet = new Set<string>();

  // Count likes per project
  for (const row of likeCounts.data ?? []) {
    likeMap.set(row.project_id, (likeMap.get(row.project_id) ?? 0) + 1);
  }
  // Count comments per project
  for (const row of commentCounts.data ?? []) {
    commentMap.set(row.project_id, (commentMap.get(row.project_id) ?? 0) + 1);
  }
  // Track user's likes
  for (const row of userLikes.data ?? []) {
    userLikedSet.add(row.project_id);
  }

  return projects.map((project) => ({
    ...project,
    like_count: likeMap.get(project.id) ?? 0,
    comment_count: commentMap.get(project.id) ?? 0,
    user_has_liked: userLikedSet.has(project.id),
    user_is_following: followingStatus(project.user_id),
  })) as FeedItem[];
}

export async function getFeed(userId: string, page = 0): Promise<FeedItem[]> {
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
    .select(PROJECT_SELECT)
    .in('user_id', followingIds)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) throw error;
  if (!data) return [];

  return enrichProjects(data, userId, () => true);
}

export async function getDiscoverFeed(userId: string, page = 0): Promise<FeedItem[]> {
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data, error } = await supabase
    .from('projects')
    .select(PROJECT_SELECT)
    .neq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) throw error;
  if (!data) return [];

  const authorIds = [...new Set(data.map((p) => p.user_id))];
  const { data: followRows } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', userId)
    .in('following_id', authorIds);
  const followingSet = new Set((followRows ?? []).map((r) => r.following_id));

  return enrichProjects(data, userId, (authorId) => followingSet.has(authorId));
}

export async function toggleLike(userId: string, projectId: string): Promise<boolean> {
  const { data: existing } = await supabase
    .from('likes')
    .select('user_id')
    .eq('user_id', userId)
    .eq('project_id', projectId)
    .maybeSingle();

  if (existing) {
    await supabase.from('likes').delete().eq('user_id', userId).eq('project_id', projectId);
    return false;
  } else {
    await supabase.from('likes').insert({ user_id: userId, project_id: projectId });
    return true;
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
    return false;
  } else {
    await supabase.from('follows').insert({ follower_id: followerId, following_id: followingId });
    return true;
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
