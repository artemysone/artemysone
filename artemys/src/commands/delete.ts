import { supabase } from '../supabase.js';
import { requireAuth } from '../auth.js';
import { output, error } from '../output.js';

export async function deleteProject(projectId: string): Promise<void> {
  await requireAuth();

  const { error: deleteError } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId);

  if (deleteError) {
    error(`Failed to delete project: ${deleteError.message}`);
    process.exit(1);
  }

  output({ deleted: true, id: projectId }, `Deleted project ${projectId}`);
}
