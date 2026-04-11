// ============================================================
// Row types (match Supabase tables 1:1)
// ============================================================

export type ProjectMediaFormat = 'video' | 'gallery';
export type CollaboratorStatus = 'pending' | 'accepted' | 'rejected';
export type ProjectBumpType = 'patch' | 'minor' | 'major';

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

export interface ProjectTag {
  project_id: string;
  tag_id: string;
}

export interface Collaborator {
  project_id: string;
  user_id: string;
  role: string;
  status: CollaboratorStatus;
  invited_by: string | null;
  responded_at: string | null;
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

export interface Notification {
  id: string;
  user_id: string;
  actor_id: string;
  type: 'like' | 'follow' | 'comment' | 'collaborator';
  project_id: string | null;
  comment_id: string | null;
  collaborator_status: CollaboratorStatus | null;
  read: boolean;
  created_at: string;
}

export interface ProjectMedia {
  id: string;
  project_id: string;
  media_url: string;
  media_type: 'image' | 'video';
  thumbnail_url: string | null;
  sort_order: number;
  created_at: string;
}

export interface ProjectUpdate {
  id: string;
  project_id: string;
  user_id: string;
  body: string;
  version: string;
  bump_type: ProjectBumpType;
  created_at: string;
}

// ============================================================
// Composite types (joined queries used by the UI)
// ============================================================

export interface CommentWithProfile extends Comment {
  profiles: Profile;
}

export interface NotificationWithActor extends Notification {
  profiles: Profile;
  projects: Pick<Project, 'id' | 'title' | 'thumbnail_url'> | null;
}

export interface CollaboratorWithProfile extends Collaborator {
  profiles: Profile;
}

export interface ProjectUpdateWithProfile extends ProjectUpdate {
  profiles: Profile;
}

export interface ProjectRelationsRow extends Project {
  profiles: Profile;
  project_tags: { tags: Tag }[];
  collaborators: CollaboratorWithProfile[];
  project_media?: Pick<ProjectMedia, 'id'>[];
}

export interface ProjectWithDetails extends ProjectRelationsRow {
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
  media_format: ProjectMediaFormat;
  thumbnail_url?: string;
  demo_url?: string;
  repo_url?: string;
  tech_stack: string[];
  tag_ids: string[];
  collaborators: ProjectCollaboratorInput[];
}

export interface UpdateProjectInput {
  title?: string;
  description?: string;
  media_url?: string | null;
  media_type?: 'image' | 'video';
  media_format?: ProjectMediaFormat;
  thumbnail_url?: string | null;
  demo_url?: string | null;
  repo_url?: string | null;
  tech_stack?: string[];
}

export interface UpdateProfileInput {
  name?: string;
  handle?: string;
  bio?: string;
  avatar_url?: string;
}

export interface ProjectCollaboratorInput {
  user_id: string;
  role: string;
  status?: CollaboratorStatus;
}
