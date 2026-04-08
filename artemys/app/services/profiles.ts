import { supabase } from '@/lib/supabase';
import type { Profile, ProfileWithStats, UpdateProfileInput } from '@/types/database';
import { isHandleValid, normalizeHandle } from '@/utils/validation';
import { getFileExtension, readUriAsBlob } from '@/utils/media';

const MAX_SEARCH_RESULTS = 50;

export async function getProfile(userId: string): Promise<ProfileWithStats | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const [projects, followers, following] = await Promise.all([
    supabase.from('projects').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('follows').select('follower_id', { count: 'exact', head: true }).eq('following_id', userId),
    supabase.from('follows').select('following_id', { count: 'exact', head: true }).eq('follower_id', userId),
  ]);
  if (projects.error) throw projects.error;
  if (followers.error) throw followers.error;
  if (following.error) throw following.error;

  return {
    ...(data as Profile),
    project_count: projects.count ?? 0,
    follower_count: followers.count ?? 0,
    following_count: following.count ?? 0,
  };
}

export async function getProfileByHandle(handle: string): Promise<Profile | null> {
  const normalizedHandle = normalizeHandle(handle);
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('handle', normalizedHandle)
    .maybeSingle();
  if (error) throw error;
  return data as Profile | null;
}

export async function updateProfile(userId: string, updates: UpdateProfileInput) {
  const normalizedUpdates: UpdateProfileInput = {
    ...updates,
    ...(typeof updates.name === 'string' ? { name: updates.name.trim() } : {}),
    ...(typeof updates.bio === 'string' ? { bio: updates.bio.trim() } : {}),
    ...(typeof updates.handle === 'string'
      ? { handle: normalizeHandle(updates.handle) }
      : {}),
  };

  const { data, error } = await supabase
    .from('profiles')
    .update(normalizedUpdates)
    .eq('id', userId)
    .select()
    .single();
  if (error) throw error;
  return data as Profile;
}

export async function uploadAvatar(userId: string, uri: string): Promise<string> {
  const ext = getFileExtension(uri, 'jpg');
  const path = `${userId}/avatar.${ext}`;

  const blob = await readUriAsBlob(uri, 'Failed to read the selected avatar.');
  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, blob, { upsert: true, contentType: `image/${ext}` });
  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
  const avatarUrl = `${publicUrl}?t=${Date.now()}`;

  await updateProfile(userId, { avatar_url: avatarUrl });
  return avatarUrl;
}

export async function searchProfiles(query: string, limit = 10): Promise<Profile[]> {
  const trimmedQuery = query.trim();
  if (trimmedQuery.length < 2) return [];

  const { data, error } = await supabase
    .rpc('search_profiles', {
      p_query: trimmedQuery,
      p_limit: Math.min(Math.max(limit, 1), MAX_SEARCH_RESULTS),
    });
  if (error) throw error;
  return (data ?? []) as Profile[];
}

export async function checkHandleAvailable(handle: string): Promise<boolean> {
  const normalizedHandle = normalizeHandle(handle);
  if (!isHandleValid(normalizedHandle)) return false;

  const { count, error } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('handle', normalizedHandle);
  if (error) throw error;
  return count === 0;
}
