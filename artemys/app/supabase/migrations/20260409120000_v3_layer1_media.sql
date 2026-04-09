-- Artemys Layer 1 hardening
-- Adds explicit project media formats, tech stack metadata, and collaborator invite states.

-- ============================================================
-- PROJECT MODEL
-- ============================================================

alter table public.projects
  add column if not exists media_format text not null default 'gallery',
  add column if not exists tech_stack text[] not null default '{}'::text[];

alter table public.projects
  drop constraint if exists projects_media_format_check;

alter table public.projects
  add constraint projects_media_format_check
  check (media_format in ('video', 'gallery'));

update public.projects
set media_format = case
  when media_type = 'video' then 'video'
  else 'gallery'
end;

-- ============================================================
-- COLLABORATOR WORKFLOW
-- ============================================================

alter table public.collaborators
  add column if not exists status text not null default 'pending',
  add column if not exists invited_by uuid references public.profiles(id) on delete set null,
  add column if not exists responded_at timestamptz;

alter table public.collaborators
  drop constraint if exists collaborators_status_check;

alter table public.collaborators
  add constraint collaborators_status_check
  check (status in ('pending', 'accepted', 'rejected'));

update public.collaborators c
set
  status = 'accepted',
  invited_by = p.user_id,
  responded_at = coalesce(c.responded_at, c.created_at)
from public.projects p
where p.id = c.project_id;

-- ============================================================
-- MEDIA VALIDATION
-- ============================================================

create or replace function public.validate_project_media_shape()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  project_format text;
  existing_media_count integer;
begin
  select media_format
    into project_format
  from public.projects
  where id = new.project_id;

  if project_format is null then
    raise exception 'Project not found';
  end if;

  select count(*)
    into existing_media_count
  from public.project_media
  where project_id = new.project_id
    and (TG_OP <> 'UPDATE' or id <> new.id);

  if project_format = 'video' then
    if new.media_type <> 'video' then
      raise exception 'Video projects may only contain video media';
    end if;

    if existing_media_count >= 1 then
      raise exception 'Video projects may contain only one media item';
    end if;
  elsif project_format = 'gallery' then
    if new.media_type <> 'image' then
      raise exception 'Image galleries may only contain image media';
    end if;

    if existing_media_count >= 5 then
      raise exception 'Image galleries may contain at most five media items';
    end if;
  else
    raise exception 'Unsupported project media format';
  end if;

  return new;
end;
$$;

drop trigger if exists on_project_media_validated on public.project_media;

create trigger on_project_media_validated
  before insert or update on public.project_media
  for each row execute function public.validate_project_media_shape();

-- ============================================================
-- COLLABORATOR STATUS UPDATE RPC
-- ============================================================

create or replace function public.set_collaborator_status(
  p_project_id uuid,
  p_user_id uuid,
  p_status text
)
returns public.collaborators
language plpgsql
security definer
set search_path = public
as $$
declare
  project_owner_id uuid;
  updated_row public.collaborators;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if p_status not in ('pending', 'accepted', 'rejected') then
    raise exception 'Unsupported collaborator status';
  end if;

  select user_id
    into project_owner_id
  from public.projects
  where id = p_project_id;

  if project_owner_id is null then
    raise exception 'Project not found';
  end if;

  if auth.uid() <> project_owner_id and auth.uid() <> p_user_id then
    raise exception 'Not allowed';
  end if;

  update public.collaborators
  set
    status = p_status,
    responded_at = case when p_status in ('accepted', 'rejected') then now() else null end,
    invited_by = coalesce(invited_by, project_owner_id)
  where project_id = p_project_id
    and user_id = p_user_id
  returning * into updated_row;

  if not found then
    raise exception 'Collaborator not found';
  end if;

  return updated_row;
end;
$$;

-- ============================================================
-- CREATE PROJECT RPC
-- ============================================================

create or replace function public.create_project_with_relations(
  p_title text,
  p_description text default '',
  p_media_url text default null,
  p_media_type text default 'image',
  p_media_format text default 'gallery',
  p_thumbnail_url text default null,
  p_demo_url text default null,
  p_repo_url text default null,
  p_tech_stack text[] default '{}'::text[],
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
  collaborator_status text;
  project_media_format text := lower(btrim(coalesce(p_media_format, 'gallery')));
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if project_media_format not in ('video', 'gallery') then
    raise exception 'Unsupported project media format';
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
    media_format,
    thumbnail_url,
    demo_url,
    repo_url,
    tech_stack
  )
  values (
    auth.uid(),
    p_title,
    coalesce(p_description, ''),
    p_media_url,
    coalesce(p_media_type, 'image'),
    project_media_format,
    p_thumbnail_url,
    nullif(btrim(p_demo_url), ''),
    nullif(btrim(p_repo_url), ''),
    coalesce(p_tech_stack, '{}'::text[])
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
    collaborator_status := lower(btrim(coalesce(collaborator_item->>'status', 'pending')));

    insert into public.collaborators (project_id, user_id, role, status, invited_by, responded_at)
    values (
      created_project.id,
      (collaborator_item->>'user_id')::uuid,
      coalesce(collaborator_item->>'role', ''),
      case
        when collaborator_status in ('pending', 'accepted', 'rejected') then collaborator_status
        else 'pending'
      end,
      auth.uid(),
      case
        when collaborator_status in ('accepted', 'rejected') then now()
        else null
      end
    );
  end loop;

  return created_project;
end;
$$;
