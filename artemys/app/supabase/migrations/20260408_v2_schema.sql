-- Artemys V2 Schema Migration
-- Adds: notifications, project_media, project link fields, search functions

-- ============================================================
-- NEW TABLES
-- ============================================================

-- Notifications (in-app)
create table public.notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  actor_id uuid references public.profiles(id) on delete cascade not null,
  type text not null check (type in ('like', 'follow', 'comment', 'collaborator')),
  project_id uuid references public.projects(id) on delete set null,
  comment_id uuid references public.comments(id) on delete set null,
  read boolean default false not null,
  created_at timestamptz default now() not null
);

create index idx_notifications_user_created on public.notifications(user_id, created_at desc);
create index idx_notifications_unread on public.notifications(user_id) where read = false;

-- Project media (multiple media per project)
create table public.project_media (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  media_url text not null,
  media_type text default 'image' not null check (media_type in ('image', 'video')),
  thumbnail_url text,
  sort_order integer default 0 not null,
  created_at timestamptz default now() not null
);

create index idx_project_media_project on public.project_media(project_id, sort_order);

-- ============================================================
-- ALTER EXISTING TABLES
-- ============================================================

-- Add link fields to projects
alter table public.projects add column demo_url text;
alter table public.projects add column repo_url text;

-- ============================================================
-- NEW FUNCTIONS
-- ============================================================

-- Search projects by title/description
create or replace function public.search_projects(
  p_query text,
  p_limit integer default 20
)
returns setof public.projects
language sql
stable
security invoker
set search_path = public
as $$
  select *
  from public.projects
  where char_length(btrim(p_query)) >= 2
    and (
      title ilike '%' || btrim(p_query) || '%'
      or description ilike '%' || btrim(p_query) || '%'
    )
  order by created_at desc
  limit least(greatest(coalesce(p_limit, 20), 1), 50);
$$;

-- Get projects by tag
create or replace function public.get_projects_by_tag(
  p_tag_id uuid,
  p_limit integer default 20,
  p_offset integer default 0
)
returns setof public.projects
language sql
stable
security invoker
set search_path = public
as $$
  select p.*
  from public.projects p
  join public.project_tags pt on pt.project_id = p.id
  where pt.tag_id = p_tag_id
  order by p.created_at desc
  limit least(greatest(coalesce(p_limit, 20), 1), 50)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.notifications enable row level security;
alter table public.project_media enable row level security;

-- Notifications: users see their own, authenticated users can create
create policy "Users can view own notifications"
  on public.notifications for select using (auth.uid() = user_id);

create policy "Authenticated users can create notifications"
  on public.notifications for insert with check (auth.uid() = actor_id);

create policy "Users can update own notifications"
  on public.notifications for update using (auth.uid() = user_id);

-- Project media: anyone can read, project owner can manage
create policy "Project media is viewable by everyone"
  on public.project_media for select using (true);

create policy "Project owners can add media"
  on public.project_media for insert
  with check (
    auth.uid() = (select user_id from public.projects where id = project_id)
  );

create policy "Project owners can update media"
  on public.project_media for update
  using (
    auth.uid() = (select user_id from public.projects where id = project_id)
  );

create policy "Project owners can delete media"
  on public.project_media for delete
  using (
    auth.uid() = (select user_id from public.projects where id = project_id)
  );
