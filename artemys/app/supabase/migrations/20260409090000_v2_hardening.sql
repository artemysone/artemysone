-- Artemys V2 hardening and correctness fixes
-- Fixes notification forgery and rich project link params

drop policy if exists "Authenticated users can create notifications" on public.notifications;

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

create or replace function public.create_project_with_relations(
  p_title text,
  p_description text default '',
  p_media_url text default null,
  p_media_type text default 'image',
  p_thumbnail_url text default null,
  p_demo_url text default null,
  p_repo_url text default null,
  p_tag_ids uuid[] default '{}',
  p_collaborators jsonb default '[]'::jsonb
)
returns public.projects
language plpgsql
security invoker
set search_path = public
as $$
declare
  created_project public.projects;
  collaborator_item jsonb;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if jsonb_typeof(coalesce(p_collaborators, '[]'::jsonb)) <> 'array' then
    raise exception 'Collaborators payload must be an array';
  end if;

  insert into public.projects (
    user_id,
    title,
    description,
    media_url,
    media_type,
    thumbnail_url,
    demo_url,
    repo_url
  )
  values (
    auth.uid(),
    p_title,
    coalesce(p_description, ''),
    p_media_url,
    coalesce(p_media_type, 'image'),
    p_thumbnail_url,
    nullif(btrim(p_demo_url), ''),
    nullif(btrim(p_repo_url), '')
  )
  returning * into created_project;

  if coalesce(array_length(p_tag_ids, 1), 0) > 0 then
    insert into public.project_tags (project_id, tag_id)
    select created_project.id, tag_id
    from unnest(p_tag_ids) as tag_id;
  end if;

  for collaborator_item in
    select value from jsonb_array_elements(coalesce(p_collaborators, '[]'::jsonb))
  loop
    insert into public.collaborators (project_id, user_id, role)
    values (
      created_project.id,
      (collaborator_item->>'user_id')::uuid,
      coalesce(collaborator_item->>'role', '')
    );
  end loop;

  return created_project;
end;
$$;
