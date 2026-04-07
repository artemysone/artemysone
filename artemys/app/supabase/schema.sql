-- Artemys V1 Database Schema
-- Run this in the Supabase SQL Editor

-- ============================================================
-- TABLES
-- ============================================================

-- Profiles (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  name text not null,
  handle text not null unique,
  avatar_url text,
  bio text default '',
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,

  constraint handle_format check (handle ~ '^[a-z0-9_]{3,30}$')
);

-- Projects
create table public.projects (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  description text default '',
  media_url text,
  media_type text default 'image' check (media_type in ('image', 'video')),
  thumbnail_url text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Tags (predefined, platform-managed)
create table public.tags (
  id uuid default gen_random_uuid() primary key,
  name text not null unique
);

-- Project ↔ Tag junction
create table public.project_tags (
  project_id uuid references public.projects(id) on delete cascade not null,
  tag_id uuid references public.tags(id) on delete cascade not null,
  primary key (project_id, tag_id)
);

-- Collaborators (users tagged on projects)
create table public.collaborators (
  project_id uuid references public.projects(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  role text default '',
  created_at timestamptz default now() not null,
  primary key (project_id, user_id)
);

-- Follows
create table public.follows (
  follower_id uuid references public.profiles(id) on delete cascade not null,
  following_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz default now() not null,
  primary key (follower_id, following_id),

  constraint no_self_follow check (follower_id != following_id)
);

-- Likes
create table public.likes (
  user_id uuid references public.profiles(id) on delete cascade not null,
  project_id uuid references public.projects(id) on delete cascade not null,
  created_at timestamptz default now() not null,
  primary key (user_id, project_id)
);

-- Comments
create table public.comments (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  text text not null,
  created_at timestamptz default now() not null
);

-- ============================================================
-- INDEXES
-- ============================================================

create index idx_projects_user_id on public.projects(user_id);
create index idx_projects_created_at on public.projects(created_at desc);
create index idx_project_tags_tag_id on public.project_tags(tag_id);
create index idx_collaborators_user_id on public.collaborators(user_id);
create index idx_follows_following_id on public.follows(following_id);
create index idx_likes_project_id on public.likes(project_id);
create index idx_comments_project_id on public.comments(project_id);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================

create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger on_profiles_updated
  before update on public.profiles
  for each row execute function public.handle_updated_at();

create trigger on_projects_updated
  before update on public.projects
  for each row execute function public.handle_updated_at();

-- ============================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, handle)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'handle', 'user_' || left(new.id::text, 8))
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.tags enable row level security;
alter table public.project_tags enable row level security;
alter table public.collaborators enable row level security;
alter table public.follows enable row level security;
alter table public.likes enable row level security;
alter table public.comments enable row level security;

-- Profiles: anyone can read, users can update their own
create policy "Profiles are viewable by everyone"
  on public.profiles for select using (true);

create policy "Users can update their own profile"
  on public.profiles for update using (auth.uid() = id);

-- Projects: anyone can read, users can manage their own
create policy "Projects are viewable by everyone"
  on public.projects for select using (true);

create policy "Users can create projects"
  on public.projects for insert with check (auth.uid() = user_id);

create policy "Users can update their own projects"
  on public.projects for update using (auth.uid() = user_id);

create policy "Users can delete their own projects"
  on public.projects for delete using (auth.uid() = user_id);

-- Tags: anyone can read
create policy "Tags are viewable by everyone"
  on public.tags for select using (true);

-- Project tags: anyone can read, project owner can manage
create policy "Project tags are viewable by everyone"
  on public.project_tags for select using (true);

create policy "Project owners can manage tags"
  on public.project_tags for insert
  with check (
    auth.uid() = (select user_id from public.projects where id = project_id)
  );

create policy "Project owners can remove tags"
  on public.project_tags for delete
  using (
    auth.uid() = (select user_id from public.projects where id = project_id)
  );

-- Collaborators: anyone can read, project owner can manage
create policy "Collaborators are viewable by everyone"
  on public.collaborators for select using (true);

create policy "Project owners can add collaborators"
  on public.collaborators for insert
  with check (
    auth.uid() = (select user_id from public.projects where id = project_id)
  );

create policy "Project owners can remove collaborators"
  on public.collaborators for delete
  using (
    auth.uid() = (select user_id from public.projects where id = project_id)
  );

-- Follows: anyone can read, users can manage their own follows
create policy "Follows are viewable by everyone"
  on public.follows for select using (true);

create policy "Users can follow others"
  on public.follows for insert with check (auth.uid() = follower_id);

create policy "Users can unfollow"
  on public.follows for delete using (auth.uid() = follower_id);

-- Likes: anyone can read, users can manage their own likes
create policy "Likes are viewable by everyone"
  on public.likes for select using (true);

create policy "Users can like projects"
  on public.likes for insert with check (auth.uid() = user_id);

create policy "Users can unlike projects"
  on public.likes for delete using (auth.uid() = user_id);

-- Comments: anyone can read, authenticated users can create, users can delete their own
create policy "Comments are viewable by everyone"
  on public.comments for select using (true);

create policy "Authenticated users can comment"
  on public.comments for insert with check (auth.uid() = user_id);

create policy "Users can delete their own comments"
  on public.comments for delete using (auth.uid() = user_id);

-- ============================================================
-- SEED DATA
-- ============================================================

insert into public.tags (name) values
  ('Design'),
  ('Mobile'),
  ('Web'),
  ('AI / ML'),
  ('Hardware'),
  ('Music'),
  ('Film'),
  ('Games');
