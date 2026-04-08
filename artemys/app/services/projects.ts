import { Platform } from 'react-native';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { supabase } from '@/lib/supabase';
import type { CreateProjectInput, Project, ProjectRelationsRow, ProjectWithDetails } from '@/types/database';
import { getFileExtension, getMediaContentType, readUriAsBlob, extractVideoThumbnailWeb } from '@/utils/media';

export async function createProject(input: CreateProjectInput): Promise<Project> {
  const { data: project, error } = await supabase.rpc('create_project_with_relations', {
    p_title: input.title.trim(),
    p_description: input.description.trim(),
    p_media_url: input.media_url ?? null,
    p_media_type: input.media_type ?? 'image',
    p_thumbnail_url: input.thumbnail_url ?? null,
    p_tag_ids: input.tag_ids,
    p_collaborators: input.collaborators,
  });
  if (error) throw error;
  if (!project) throw new Error('Project creation returned no data.');

  return project as Project;
}

export async function getProject(projectId: string, currentUserId?: string): Promise<ProjectWithDetails | null> {
  const { data, error } = await supabase
    .from('projects')
    .select(`
      *,
      profiles!projects_user_id_fkey(*),
      project_tags(tags(*)),
      collaborators(*, profiles(*))
    `)
    .eq('id', projectId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const [likes, comments, userLike] = await Promise.all([
    supabase.from('likes').select('user_id', { count: 'exact', head: true }).eq('project_id', projectId),
    supabase.from('comments').select('id', { count: 'exact', head: true }).eq('project_id', projectId),
    currentUserId
      ? supabase.from('likes').select('user_id').eq('project_id', projectId).eq('user_id', currentUserId).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  if (likes.error) throw likes.error;
  if (comments.error) throw comments.error;
  if ('error' in userLike && userLike.error) throw userLike.error;

  return {
    ...(data as ProjectRelationsRow),
    like_count: likes.count ?? 0,
    comment_count: comments.count ?? 0,
    user_has_liked: !!userLike.data,
  } as ProjectWithDetails;
}

export async function getUserProjects(userId: string): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Project[];
}

export async function uploadProjectMedia(
  userId: string,
  projectId: string,
  uri: string,
  mediaType: 'image' | 'video'
): Promise<{ mediaUrl: string; thumbnailUrl?: string }> {
  const ext = getFileExtension(uri, mediaType === 'video' ? 'mp4' : 'jpg');
  const path = `${userId}/${projectId}/media.${ext}`;
  const thumbPath = `${userId}/${projectId}/thumb.jpg`;

  const blob = await readUriAsBlob(uri, 'Failed to read the selected project media.');
  const contentType = getMediaContentType(mediaType, ext);
  const { error } = await supabase.storage
    .from('project-media')
    .upload(path, blob, { upsert: true, contentType });
  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage.from('project-media').getPublicUrl(path);

  // Generate thumbnail for video
  let thumbnailUrl: string | undefined;
  if (mediaType === 'video') {
    try {
      let thumbBlob: Blob | null = null;

      if (Platform.OS === 'web') {
        thumbBlob = await extractVideoThumbnailWeb(uri);
      } else {
        const { uri: thumbUri } = await VideoThumbnails.getThumbnailAsync(uri, { time: 0 });
        thumbBlob = await readUriAsBlob(thumbUri, 'Failed to read video thumbnail.');
      }

      if (thumbBlob) {
        const { error: thumbError } = await supabase.storage
          .from('project-media')
          .upload(thumbPath, thumbBlob, { upsert: true, contentType: 'image/jpeg' });
        if (!thumbError) {
          const { data: { publicUrl: thumbPublicUrl } } = supabase.storage
            .from('project-media')
            .getPublicUrl(thumbPath);
          thumbnailUrl = `${thumbPublicUrl}?t=${Date.now()}`;
        }
      }
    } catch (err) {
      console.warn('Failed to generate video thumbnail:', err);
    }
  }

  const { error: updateError } = await supabase
    .from('projects')
    .update({
      media_url: publicUrl,
      media_type: mediaType,
      ...(thumbnailUrl ? { thumbnail_url: thumbnailUrl } : {}),
    })
    .eq('id', projectId);
  if (updateError) {
    const pathsToRemove = thumbnailUrl ? [path, thumbPath] : [path];
    await supabase.storage.from('project-media').remove(pathsToRemove);
    throw updateError;
  }

  return { mediaUrl: publicUrl, thumbnailUrl };
}

export async function deleteProject(projectId: string) {
  const { error } = await supabase.from('projects').delete().eq('id', projectId);
  if (error) throw error;
}
