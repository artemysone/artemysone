import { supabase } from '../supabase.js';
import { output, error } from '../output.js';
import type { Tag } from '../types.js';

export async function listTags(): Promise<void> {
  const { data, error: fetchError } = await supabase
    .from('tags')
    .select('*')
    .order('name');

  if (fetchError) {
    error(`Failed to fetch tags: ${fetchError.message}`);
    process.exit(1);
  }

  const tags = (data ?? []) as Tag[];

  output(
    tags,
    tags.length === 0
      ? 'No tags found.'
      : tags.map((t) => `  ${t.name} (${t.id})`).join('\n'),
  );
}
