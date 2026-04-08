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

create or replace function public.create_follow_notification(
  p_following_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if p_following_id is null or p_following_id = auth.uid() then
    return;
  end if;

  if exists (
    select 1
    from public.follows
    where follower_id = auth.uid()
      and following_id = p_following_id
  ) then
    insert into public.notifications (user_id, actor_id, type)
    values (p_following_id, auth.uid(), 'follow');
  end if;
end;
$$;

create or replace function public.create_like_notification(
  p_project_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  project_owner_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select user_id
    into project_owner_id
  from public.projects
  where id = p_project_id;

  if project_owner_id is null or project_owner_id = auth.uid() then
    return;
  end if;

  if exists (
    select 1
    from public.likes
    where user_id = auth.uid()
      and project_id = p_project_id
  ) then
    insert into public.notifications (user_id, actor_id, type, project_id)
    values (project_owner_id, auth.uid(), 'like', p_project_id);
  end if;
end;
$$;

create or replace function public.create_comment_notification(
  p_comment_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  project_owner_id uuid;
  related_project_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select c.project_id, p.user_id
    into related_project_id, project_owner_id
  from public.comments c
  join public.projects p on p.id = c.project_id
  where c.id = p_comment_id
    and c.user_id = auth.uid();

  if related_project_id is null or project_owner_id is null or project_owner_id = auth.uid() then
    return;
  end if;

  insert into public.notifications (user_id, actor_id, type, project_id, comment_id)
  values (project_owner_id, auth.uid(), 'comment', related_project_id, p_comment_id);
end;
$$;

create or replace function public.create_collaborator_notification(
  p_project_id uuid,
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  project_owner_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select user_id
    into project_owner_id
  from public.projects
  where id = p_project_id;

  if project_owner_id is null or project_owner_id <> auth.uid() or p_user_id is null or p_user_id = auth.uid() then
    return;
  end if;

  if exists (
    select 1
    from public.collaborators
    where project_id = p_project_id
      and user_id = p_user_id
  ) then
    insert into public.notifications (user_id, actor_id, type, project_id)
    values (p_user_id, auth.uid(), 'collaborator', p_project_id);
  end if;
end;
$$;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.notifications enable row level security;
alter table public.project_media enable row level security;

-- Notifications: users see and update their own
create policy "Users can view own notifications"
  on public.notifications for select using (auth.uid() = user_id);

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
