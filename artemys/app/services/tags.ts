import { supabase } from '@/lib/supabase';
import type { Tag } from '@/types/database';

export async function getTags(): Promise<Tag[]> {
  const { data, error } = await supabase.from('tags').select('*');
  if (error) throw error;
  return (data ?? []) as Tag[];
}
