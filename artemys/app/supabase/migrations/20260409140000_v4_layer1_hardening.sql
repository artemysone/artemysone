-- Artemys Layer 1 hardening
-- Enforces collaborator consent, syncs collaborator notification state, hardens storage policy checks,
-- and makes profile handle allocation resilient to collisions.

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

alter table public.notifications
  add column if not exists collaborator_status text;

alter table public.notifications
  drop constraint if exists notifications_collaborator_status_check;

alter table public.notifications
  add constraint notifications_collaborator_status_check
  check (
    collaborator_status is null
    or collaborator_status in ('pending', 'accepted', 'rejected')
  );

create or replace function public.sync_collaborator_notification_state()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    update public.notifications
    set collaborator_status = 'rejected',
        read = true
    where user_id = old.user_id
      and project_id = old.project_id
      and type = 'collaborator';
    return old;
  end if;

  if tg_op = 'UPDATE' and new.status in ('accepted', 'rejected') then
    update public.notifications
    set collaborator_status = new.status,
        read = true
    where user_id = new.user_id
      and project_id = new.project_id
      and type = 'collaborator';
  end if;

  return new;
end;
$$;

drop trigger if exists on_collaborators_sync_notification on public.collaborators;

create trigger on_collaborators_sync_notification
  after update or delete on public.collaborators
  for each row execute function public.sync_collaborator_notification_state();

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
  invite_status text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select status
    into invite_status
  from public.collaborators
  where project_id = p_project_id
    and user_id = p_user_id;

  if invite_status is null then
    return;
  end if;

  update public.notifications
  set
    actor_id = auth.uid(),
    collaborator_status = invite_status,
    read = false,
    created_at = now()
  where user_id = p_user_id
    and project_id = p_project_id
    and type = 'collaborator';

  if not found then
    insert into public.notifications (user_id, actor_id, type, project_id, collaborator_status)
    values (p_user_id, auth.uid(), 'collaborator', p_project_id, invite_status);
  end if;
end;
$$;

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
  updated_row public.collaborators;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if p_status not in ('accepted', 'rejected') then
    raise exception 'Unsupported collaborator status';
  end if;

  if auth.uid() <> p_user_id then
    raise exception 'Not allowed';
  end if;

  select *
    into updated_row
  from public.collaborators
  where project_id = p_project_id
    and user_id = p_user_id
  for update;

  if not found then
    raise exception 'Collaborator not found';
  end if;

  if updated_row.status = p_status then
    return updated_row;
  end if;

  if updated_row.status <> 'pending' then
    raise exception 'Collaborator invite is no longer pending';
  end if;

  update public.collaborators
  set
    status = p_status,
    responded_at = now()
  where project_id = p_project_id
    and user_id = p_user_id
  returning * into updated_row;

  return updated_row;
end;
$$;

-- ============================================================
-- PROJECT CREATION
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
    insert into public.collaborators (project_id, user_id, role, status, invited_by, responded_at)
    values (
      created_project.id,
      (collaborator_item->>'user_id')::uuid,
      coalesce(collaborator_item->>'role', ''),
      'pending',
      auth.uid(),
      null
    );
  end loop;

  return created_project;
end;
$$;

-- ============================================================
-- COLLABORATORS
-- ============================================================

drop policy if exists "Project owners can add collaborators" on public.collaborators;

create policy "Project owners can add collaborators"
  on public.collaborators for insert
  with check (
    auth.uid() = (select user_id from public.projects where id = project_id)
    and status = 'pending'
  );

drop policy if exists "Project owners can remove collaborators" on public.collaborators;

create policy "Project owners can remove collaborators"
  on public.collaborators for delete
  using (
    auth.uid() = (select user_id from public.projects where id = project_id)
  );

-- ============================================================
-- STORAGE
-- ============================================================

update storage.buckets
set
  file_size_limit = 5 * 1024 * 1024,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/heic']
where id = 'avatars';

update storage.buckets
set
  file_size_limit = 50 * 1024 * 1024,
  allowed_mime_types = array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'video/mp4',
    'video/quicktime',
    'video/x-m4v'
  ]
where id = 'project-media';

drop policy if exists "Avatar images are publicly accessible" on storage.objects;
drop policy if exists "Users can upload their own avatar" on storage.objects;
drop policy if exists "Users can update their own avatar" on storage.objects;
drop policy if exists "Project media is publicly accessible" on storage.objects;
drop policy if exists "Users can upload project media" on storage.objects;
drop policy if exists "Users can update their own project media" on storage.objects;
drop policy if exists "Users can delete their own project media" on storage.objects;

create policy "Avatar images are publicly accessible"
  on storage.objects for select
  using (
    bucket_id = 'avatars'
    and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp', 'heic')
    and lower(storage.filename(name)) = 'avatar.' || lower(storage.extension(name))
  );

create policy "Users can upload their own avatar"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
    and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp', 'heic')
    and lower(storage.filename(name)) = 'avatar.' || lower(storage.extension(name))
  );

create policy "Users can update their own avatar"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
    and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp', 'heic')
    and lower(storage.filename(name)) = 'avatar.' || lower(storage.extension(name))
  )
  with check (
    bucket_id = 'avatars'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
    and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp', 'heic')
    and lower(storage.filename(name)) = 'avatar.' || lower(storage.extension(name))
  );

create policy "Project media is publicly accessible"
  on storage.objects for select
  using (
    bucket_id = 'project-media'
    and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp', 'heic', 'mp4', 'mov', 'm4v')
    and (storage.foldername(name))[1] is not null
    and (storage.foldername(name))[2] is not null
    and exists (
      select 1
      from public.projects
      where id::text = (storage.foldername(name))[2]
        and user_id::text = (storage.foldername(name))[1]
    )
  );

create policy "Users can upload project media"
  on storage.objects for insert
  with check (
    bucket_id = 'project-media'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
    and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp', 'heic', 'mp4', 'mov', 'm4v')
    and (storage.foldername(name))[2] is not null
    and exists (
      select 1
      from public.projects
      where id::text = (storage.foldername(name))[2]
        and user_id = auth.uid()
    )
  );

create policy "Users can update their own project media"
  on storage.objects for update
  using (
    bucket_id = 'project-media'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
    and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp', 'heic', 'mp4', 'mov', 'm4v')
    and (storage.foldername(name))[2] is not null
    and exists (
      select 1
      from public.projects
      where id::text = (storage.foldername(name))[2]
        and user_id = auth.uid()
    )
  )
  with check (
    bucket_id = 'project-media'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
    and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp', 'heic', 'mp4', 'mov', 'm4v')
    and (storage.foldername(name))[2] is not null
    and exists (
      select 1
      from public.projects
      where id::text = (storage.foldername(name))[2]
        and user_id = auth.uid()
    )
  );

create policy "Users can delete their own project media"
  on storage.objects for delete
  using (
    bucket_id = 'project-media'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
    and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp', 'heic', 'mp4', 'mov', 'm4v')
    and (storage.foldername(name))[2] is not null
    and exists (
      select 1
      from public.projects
      where id::text = (storage.foldername(name))[2]
        and user_id = auth.uid()
    )
  );
