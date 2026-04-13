// Types duplicated from app/types/database.ts — CLI-relevant subset only.
// These match the Supabase tables 1:1.

export type ProjectMediaFormat = 'video' | 'gallery';

export interface Profile {
  id: string;
  name: string;
  handle: string;
  avatar_url: string | null;
  bio: string;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  user_id: string;
  title: string;
  description: string;
  media_url: string | null;
  media_type: 'image' | 'video';
  media_format: ProjectMediaFormat;
  thumbnail_url: string | null;
  demo_url: string | null;
  repo_url: string | null;
  tech_stack: string[];
  current_version: string;
  created_at: string;
  updated_at: string;
}

export interface Tag {
  id: string;
  name: string;
}

