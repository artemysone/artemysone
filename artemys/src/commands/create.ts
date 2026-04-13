import { supabase } from '../supabase.js';
import { requireAuth } from '../auth.js';
import { output, error } from '../output.js';
import { normalizeTechStack, resolveTagNames, uploadMedia } from '../media.js';
import type { Project, ProjectMediaFormat } from '../types.js';

interface CreateOptions {
  title: string;
  description: string;
  media?: string;
  mediaFormat: string;
  demoUrl?: string;
  repoUrl?: string;
  techStack?: string;
  tags?: string;
}

export async function createProject(opts: CreateOptions): Promise<void> {
  const { userId } = await requireAuth();

  const mediaFormat = opts.mediaFormat as ProjectMediaFormat;
  const techStack = opts.techStack ? normalizeTechStack(opts.techStack) : [];
  const tagIds = opts.tags ? await resolveTagNames(opts.tags) : [];

  const { data: project, error: rpcError } = await supabase.rpc(
    'create_project_with_relations',
    {
      p_title: opts.title.trim(),
      p_description: opts.description.trim(),
      p_media_url: null,
      p_media_type: 'image',
      p_media_format: mediaFormat,
      p_thumbnail_url: null,
      p_demo_url: opts.demoUrl?.trim() ?? null,
      p_repo_url: opts.repoUrl?.trim() ?? null,
      p_tech_stack: techStack,
      p_tag_ids: tagIds,
      p_collaborators: [],
    },
  );

  if (rpcError) {
    error(`Failed to create project: ${rpcError.message}`);
    process.exit(1);
  }

  const created = project as Project;

  if (opts.media) {
    const { publicUrl, mediaType } = await uploadMedia(userId, created.id, opts.media);

    const { error: updateError } = await supabase
      .from('projects')
      .update({ media_url: publicUrl, media_type: mediaType })
      .eq('id', created.id);

    if (updateError) {
      error(`Failed to update project with media URL: ${updateError.message}`);
      process.exit(1);
    }

    created.media_url = publicUrl;
    created.media_type = mediaType;
  }

  output(created, `Created project: ${created.title} (${created.id})`);
}
