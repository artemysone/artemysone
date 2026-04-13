import { supabase } from '../supabase.js';
import { requireAuth } from '../auth.js';
import { output, error } from '../output.js';
import { normalizeTechStack, resolveTagNames, uploadMedia } from '../media.js';
import type { Project, ProjectMediaFormat } from '../types.js';

interface UpdateOptions {
  title?: string;
  description?: string;
  media?: string;
  mediaFormat?: string;
  demoUrl?: string;
  repoUrl?: string;
  techStack?: string;
  tags?: string;
}

export async function updateProject(
  projectId: string,
  opts: UpdateOptions,
): Promise<void> {
  const { userId } = await requireAuth();

  const updates: Record<string, unknown> = {};

  if (opts.title !== undefined) updates.title = opts.title.trim();
  if (opts.description !== undefined) updates.description = opts.description.trim();
  if (opts.mediaFormat !== undefined) updates.media_format = opts.mediaFormat as ProjectMediaFormat;
  if (opts.demoUrl !== undefined) updates.demo_url = opts.demoUrl.trim() || null;
  if (opts.repoUrl !== undefined) updates.repo_url = opts.repoUrl.trim() || null;
  if (opts.techStack !== undefined) updates.tech_stack = normalizeTechStack(opts.techStack);

  if (opts.media) {
    const { publicUrl, mediaType } = await uploadMedia(userId, projectId, opts.media);
    updates.media_url = publicUrl;
    updates.media_type = mediaType;
  }

  if (opts.tags !== undefined) {
    const tagIds = await resolveTagNames(opts.tags);

    const { error: deleteError } = await supabase
      .from('project_tags')
      .delete()
      .eq('project_id', projectId);
    if (deleteError) {
      error(`Failed to clear tags: ${deleteError.message}`);
      process.exit(1);
    }

    if (tagIds.length > 0) {
      const rows = tagIds.map((tag_id) => ({ project_id: projectId, tag_id }));
      const { error: insertError } = await supabase
        .from('project_tags')
        .insert(rows);
      if (insertError) {
        error(`Failed to set tags: ${insertError.message}`);
        process.exit(1);
      }
    }
  }

  if (Object.keys(updates).length === 0 && opts.tags === undefined) {
    error('No fields provided for update.');
    process.exit(1);
  }

  let project: Project;

  if (Object.keys(updates).length > 0) {
    const { data, error: updateError } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', projectId)
      .select('*')
      .maybeSingle();

    if (updateError) {
      error(`Failed to update project: ${updateError.message}`);
      process.exit(1);
    }
    if (!data) {
      error(`Project not found: ${projectId}`);
      process.exit(1);
    }
    project = data as Project;
  } else {
    const { data, error: fetchError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .maybeSingle();

    if (fetchError || !data) {
      error(`Project not found: ${projectId}`);
      process.exit(1);
    }
    project = data as Project;
  }

  output(project, `Updated project: ${project.title} (${project.id})`);
}
