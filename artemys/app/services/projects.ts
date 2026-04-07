import { supabase } from '@/lib/supabase';
import type { Project, ProjectWithDetails, CreateProjectInput } from '@/types/database';

export async function createProject(userId: string, input: CreateProjectInput): Promise<Project> {
  // Insert the project
  const { data: project, error } = await supabase
    .from('projects')
    .insert({
      user_id: userId,
      title: input.title,
      description: input.description,
      media_url: input.media_url,
      media_type: input.media_type ?? 'image',
      thumbnail_url: input.thumbnail_url,
    })
    .select()
    .single();
  if (error) throw error;

  // Insert tags
  if (input.tag_ids.length > 0) {
    const { error: tagError } = await supabase.from('project_tags').insert(
      input.tag_ids.map((tag_id) => ({ project_id: project.id, tag_id }))
    );
    if (tagError) throw tagError;
  }

  // Insert collaborators
  if (input.collaborators.length > 0) {
    const { error: collabError } = await supabase.from('collaborators').insert(
      input.collaborators.map((c) => ({
        project_id: project.id,
        user_id: c.user_id,
        role: c.role,
      }))
    );
    if (collabError) throw collabError;
  }

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
    .single();
  if (error || !data) return null;

  const [likes, comments, userLike] = await Promise.all([
    supabase.from('likes').select('user_id', { count: 'exact', head: true }).eq('project_id', projectId),
    supabase.from('comments').select('id', { count: 'exact', head: true }).eq('project_id', projectId),
    currentUserId
      ? supabase.from('likes').select('user_id').eq('project_id', projectId).eq('user_id', currentUserId).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return {
    ...data,
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
  const ext = uri.split('.').pop() ?? (mediaType === 'video' ? 'mp4' : 'jpg');
  const path = `${userId}/${projectId}/media.${ext}`;

  const response = await fetch(uri);
  const blob = await response.blob();

  const contentType = mediaType === 'video' ? `video/${ext}` : `image/${ext}`;
  const { error } = await supabase.storage
    .from('project-media')
    .upload(path, blob, { upsert: true, contentType });
  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage.from('project-media').getPublicUrl(path);

  // Update project with media URL
  await supabase
    .from('projects')
    .update({ media_url: publicUrl, media_type: mediaType })
    .eq('id', projectId);

  return { mediaUrl: publicUrl };
}

export async function deleteProject(projectId: string) {
  const { error } = await supabase.from('projects').delete().eq('id', projectId);
  if (error) throw error;
}
