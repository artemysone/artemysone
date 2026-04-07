// ============================================================
// Row types (match Supabase tables 1:1)
// ============================================================

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
  thumbnail_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Tag {
  id: string;
  name: string;
}

export interface ProjectTag {
  project_id: string;
  tag_id: string;
}

export interface Collaborator {
  project_id: string;
  user_id: string;
  role: string;
  created_at: string;
}

export interface Follow {
  follower_id: string;
  following_id: string;
  created_at: string;
}

export interface Like {
  user_id: string;
  project_id: string;
  created_at: string;
}

export interface Comment {
  id: string;
  project_id: string;
  user_id: string;
  text: string;
  created_at: string;
}

// ============================================================
// Composite types (joined queries used by the UI)
// ============================================================

export interface CollaboratorWithProfile extends Collaborator {
  profiles: Profile;
}

export interface ProjectWithDetails extends Project {
  profiles: Profile;
  project_tags: { tags: Tag }[];
  collaborators: CollaboratorWithProfile[];
  like_count: number;
  comment_count: number;
  user_has_liked: boolean;
}

export interface FeedItem extends ProjectWithDetails {
  user_is_following: boolean;
}

export interface ProfileWithStats extends Profile {
  project_count: number;
  follower_count: number;
  following_count: number;
}

// ============================================================
// Input types (for creating/updating)
// ============================================================

export interface CreateProjectInput {
  title: string;
  description: string;
  media_url?: string;
  media_type?: 'image' | 'video';
  thumbnail_url?: string;
  tag_ids: string[];
  collaborators: { user_id: string; role: string }[];
}

export interface UpdateProfileInput {
  name?: string;
  handle?: string;
  bio?: string;
  avatar_url?: string;
}
