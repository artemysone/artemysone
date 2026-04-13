import { supabase } from '../supabase.js';
import { requireAuth } from '../auth.js';
import { output, error } from '../output.js';
import type { Project } from '../types.js';

export async function listProjects(): Promise<void> {
  const { userId } = await requireAuth();

  const { data, error: fetchError } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (fetchError) {
    error(`Failed to fetch projects: ${fetchError.message}`);
    process.exit(1);
  }

  const projects = (data ?? []) as Project[];

  output(
    projects,
    projects.length === 0
      ? 'No projects yet.'
      : projects
          .map((p) => {
            const id = p.id.slice(0, 8);
            const date = new Date(p.created_at).toLocaleDateString();
            return `  ${id}  ${p.title.padEnd(30)}  v${p.current_version}  ${date}`;
          })
          .join('\n'),
  );
}
