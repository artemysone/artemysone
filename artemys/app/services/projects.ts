import { Platform } from 'react-native';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { supabase } from '@/lib/supabase';
import type {
  CreateProjectInput,
  Project,
  ProjectRelationsRow,
  ProjectWithDetails,
  UpdateProjectInput,
} from '@/types/database';
import { getFileExtension, getMediaContentType, readUriAsBlob, extractVideoThumbnailWeb } from '@/utils/media';
import { normalizeExternalUrl } from '@/utils/validation';

export interface UploadedProjectMediaAsset {
  mediaUrl: string;
  storagePath: string;
  thumbnailUrl?: string;
  thumbnailPath?: string;
}

function normalizeTechStack(stack: string[]): string[] {
  return Array.from(
    new Set(
      stack
        .map((item) => item.trim())
        .filter((item) => item.length > 0),
    ),
  );
}

function normalizeOptionalExternalUrl(value?: string | null): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;

  const trimmed = value.trim();
  return trimmed ? normalizeExternalUrl(trimmed) : null;
}

export async function createProject(input: CreateProjectInput): Promise<Project> {
  const { data: project, error } = await supabase.rpc('create_project_with_relations', {
    p_title: input.title.trim(),
    p_description: input.description.trim(),
    p_media_url: input.media_url ?? null,
    p_media_type: input.media_type ?? 'image',
    p_media_format: input.media_format,
    p_thumbnail_url: input.thumbnail_url ?? null,
    p_demo_url: input.demo_url ? normalizeExternalUrl(input.demo_url) : null,
    p_repo_url: input.repo_url ? normalizeExternalUrl(input.repo_url) : null,
    p_tech_stack: normalizeTechStack(input.tech_stack),
    p_tag_ids: input.tag_ids,
    p_collaborators: input.collaborators.map(({ user_id, role }) => ({ user_id, role })),
  });
  if (error) throw error;
  if (!project) throw new Error('Project creation returned no data.');
  return project as Project;
}

export async function updateProject(projectId: string, input: UpdateProjectInput): Promise<Project> {
  const updates: Partial<Project> = {};

  if (input.title !== undefined) updates.title = input.title.trim();
  if (input.description !== undefined) updates.description = input.description.trim();
  if (input.media_url !== undefined) updates.media_url = input.media_url;
  if (input.media_type !== undefined) updates.media_type = input.media_type;
  if (input.media_format !== undefined) updates.media_format = input.media_format;
  if (input.thumbnail_url !== undefined) updates.thumbnail_url = input.thumbnail_url;
  if (input.tech_stack !== undefined) updates.tech_stack = normalizeTechStack(input.tech_stack);

  const demoUrl = normalizeOptionalExternalUrl(input.demo_url);
  if (demoUrl !== undefined) updates.demo_url = demoUrl;

  const repoUrl = normalizeOptionalExternalUrl(input.repo_url);
  if (repoUrl !== undefined) updates.repo_url = repoUrl;

  if (Object.keys(updates).length === 0) {
    throw new Error('No project fields provided for update.');
  }

  const { data, error } = await supabase
    .from('projects')
    .update(updates)
    .eq('id', projectId)
    .select('*')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Project update returned no data.');
  return data as Project;
}

export async function getProject(projectId: string, currentUserId?: string): Promise<ProjectWithDetails | null> {
  const { data, error } = await supabase
    .from('projects')
    .select(`
      *,
      profiles!projects_user_id_fkey(*),
      project_tags(tags(*)),
      collaborators(*, profiles!collaborators_user_id_fkey(*))
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
  mediaType: 'image' | 'video',
  options?: {
    storageKey?: string;
    updateProject?: boolean;
  },
): Promise<UploadedProjectMediaAsset> {
  const storageKey = options?.storageKey ?? 'primary';
  const updateProject = options?.updateProject ?? true;
  const ext = getFileExtension(uri, mediaType === 'video' ? 'mp4' : 'jpg');
  const path = `${userId}/${projectId}/${storageKey}.${ext}`;
  const thumbPath = `${userId}/${projectId}/${storageKey}-thumb.jpg`;

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

  if (updateProject) {
    const { error: updateError } = await supabase
      .from('projects')
      .update({
        media_url: publicUrl,
        media_type: mediaType,
        thumbnail_url: thumbnailUrl ?? null,
      })
      .eq('id', projectId);
    if (updateError) {
      const pathsToRemove = thumbnailUrl ? [path, thumbPath] : [path];
      await supabase.storage.from('project-media').remove(pathsToRemove);
      throw updateError;
    }
  }

  return {
    mediaUrl: publicUrl,
    storagePath: path,
    thumbnailUrl,
    thumbnailPath: thumbnailUrl ? thumbPath : undefined,
  };
}

export async function deleteProject(projectId: string) {
  const { error } = await supabase.from('projects').delete().eq('id', projectId);
  if (error) throw error;
}

export async function cleanupUploadedProjectMedia(
  assets: UploadedProjectMediaAsset[],
): Promise<void> {
  const paths = assets.flatMap((asset) =>
    [asset.storagePath, asset.thumbnailPath].filter((path): path is string => !!path),
  );

  if (paths.length === 0) return;

  await supabase.storage.from('project-media').remove([...new Set(paths)]);
}
