import { supabase } from '@/lib/supabase';
import type { Profile, ProfileWithStats, UpdateProfileInput } from '@/types/database';

export async function getProfile(userId: string): Promise<ProfileWithStats | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error || !data) return null;

  const [projects, followers, following] = await Promise.all([
    supabase.from('projects').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('follows').select('follower_id', { count: 'exact', head: true }).eq('following_id', userId),
    supabase.from('follows').select('following_id', { count: 'exact', head: true }).eq('follower_id', userId),
  ]);

  return {
    ...(data as Profile),
    project_count: projects.count ?? 0,
    follower_count: followers.count ?? 0,
    following_count: following.count ?? 0,
  };
}

export async function getProfileByHandle(handle: string): Promise<Profile | null> {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('handle', handle.toLowerCase())
    .single();
  return data as Profile | null;
}

export async function updateProfile(userId: string, updates: UpdateProfileInput) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();
  if (error) throw error;
  return data as Profile;
}

export async function uploadAvatar(userId: string, uri: string): Promise<string> {
  const ext = uri.split('.').pop() ?? 'jpg';
  const path = `${userId}/avatar.${ext}`;

  const response = await fetch(uri);
  const blob = await response.blob();

  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, blob, { upsert: true, contentType: `image/${ext}` });
  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);

  await updateProfile(userId, { avatar_url: publicUrl });
  return publicUrl;
}

export async function searchProfiles(query: string, limit = 10): Promise<Profile[]> {
  // Escape PostgREST special chars to prevent filter injection
  const sanitized = query.replace(/[%_,.*()]/g, '');
  if (!sanitized) return [];

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .or(`name.ilike.%${sanitized}%,handle.ilike.%${sanitized}%`)
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as Profile[];
}

export async function checkHandleAvailable(handle: string): Promise<boolean> {
  const { count } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('handle', handle.toLowerCase());
  return count === 0;
}
