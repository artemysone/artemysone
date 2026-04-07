-- Artemys V1 hardening
-- Applies server-side validation, normalization, and RPC helpers

begin;

-- Normalize existing data before tightening constraints
update public.profiles
set
  name = btrim(name),
  handle = lower(btrim(handle)),
  bio = coalesce(btrim(bio), '')
where
  name <> btrim(name)
  or handle <> lower(btrim(handle))
  or bio is null
  or bio <> coalesce(btrim(bio), '');

update public.projects
set
  title = btrim(title),
  description = coalesce(btrim(description), ''),
  media_type = coalesce(media_type, 'image')
where
  title <> btrim(title)
  or description is null
  or description <> coalesce(btrim(description), '')
  or media_type is null;

update public.collaborators
set role = coalesce(btrim(role), '')
where role is null or role <> coalesce(btrim(role), '');

update public.comments
set text = btrim(text)
where text <> btrim(text);

alter table public.profiles
  alter column bio set default '',
  alter column bio set not null;

alter table public.projects
  alter column description set default '',
  alter column description set not null,
  alter column media_type set default 'image',
  alter column media_type set not null;

alter table public.collaborators
  alter column role set default '',
  alter column role set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profile_name_not_blank'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profile_name_not_blank
      check (char_length(btrim(name)) > 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'project_title_not_blank'
      and conrelid = 'public.projects'::regclass
  ) then
    alter table public.projects
      add constraint project_title_not_blank
      check (char_length(btrim(title)) > 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'comment_text_not_blank'
      and conrelid = 'public.comments'::regclass
  ) then
    alter table public.comments
      add constraint comment_text_not_blank
      check (char_length(btrim(text)) > 0);
  end if;
end
$$;

create or replace function public.normalize_profile_fields()
returns trigger as $$
begin
  new.name = btrim(new.name);
  new.handle = lower(btrim(new.handle));
  new.bio = coalesce(btrim(new.bio), '');
  return new;
end;
$$ language plpgsql;

create or replace function public.normalize_project_fields()
returns trigger as $$
begin
  new.title = btrim(new.title);
  new.description = coalesce(btrim(new.description), '');
  return new;
end;
$$ language plpgsql;

create or replace function public.normalize_comment_fields()
returns trigger as $$
begin
  new.text = btrim(new.text);
  return new;
end;
$$ language plpgsql;

drop trigger if exists on_profiles_normalized on public.profiles;
create trigger on_profiles_normalized
  before insert or update on public.profiles
  for each row execute function public.normalize_profile_fields();

drop trigger if exists on_projects_normalized on public.projects;
create trigger on_projects_normalized
  before insert or update on public.projects
  for each row execute function public.normalize_project_fields();

drop trigger if exists on_comments_normalized on public.comments;
create trigger on_comments_normalized
  before insert or update on public.comments
  for each row execute function public.normalize_comment_fields();

create or replace function public.handle_new_user()
returns trigger as $$
declare
  profile_handle text;
  profile_name text;
  profile_bio text;
begin
  profile_handle := lower(
    regexp_replace(
      btrim(coalesce(new.raw_user_meta_data->>'handle', '')),
      '[^a-z0-9_]',
      '',
      'g'
    )
  );
  if profile_handle = '' or char_length(profile_handle) < 3 then
    profile_handle := 'user_' || left(new.id::text, 8);
  end if;
  profile_handle := left(profile_handle, 30);

  profile_name := nullif(btrim(coalesce(new.raw_user_meta_data->>'name', '')), '');
  if profile_name is null then
    profile_name := profile_handle;
  end if;

  profile_bio := coalesce(btrim(new.raw_user_meta_data->>'bio'), '');

  insert into public.profiles (id, name, handle, bio)
  values (
    new.id,
    profile_name,
    profile_handle,
    profile_bio
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function public.search_profiles(
  p_query text,
  p_limit integer default 10
)
returns setof public.profiles
language sql
stable
security invoker
set search_path = public
as $$
  select *
  from public.profiles
  where char_length(btrim(p_query)) >= 2
    and (
      name ilike '%' || btrim(p_query) || '%'
      or handle ilike '%' || lower(btrim(p_query)) || '%'
    )
  order by
    case when handle = lower(btrim(p_query)) then 0 else 1 end,
    created_at desc
  limit least(greatest(coalesce(p_limit, 10), 1), 50);
$$;

create or replace function public.create_project_with_relations(
  p_title text,
  p_description text default '',
  p_media_url text default null,
  p_media_type text default 'image',
  p_thumbnail_url text default null,
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
    thumbnail_url
  )
  values (
    auth.uid(),
    p_title,
    coalesce(p_description, ''),
    p_media_url,
    coalesce(p_media_type, 'image'),
    p_thumbnail_url
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

commit;
