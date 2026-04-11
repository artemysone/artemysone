-- Artemys project versioning
-- Every project starts at 0.1.0 and bumps forward as the owner posts updates.

-- ============================================================
-- SCHEMA
-- ============================================================

alter table public.projects
  add column if not exists current_version text not null default '0.1.0';

alter table public.project_updates
  add column if not exists version text not null default '0.1.0';

alter table public.project_updates
  add column if not exists bump_type text;

update public.project_updates
  set bump_type = 'patch'
  where bump_type is null;

alter table public.project_updates
  alter column bump_type set not null;

alter table public.project_updates
  drop constraint if exists project_updates_bump_type_check;

alter table public.project_updates
  add constraint project_updates_bump_type_check
  check (bump_type in ('patch', 'minor', 'major'));

-- ============================================================
-- VERSION BUMP TRIGGER
-- ============================================================

create or replace function public.apply_project_update_version()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  current text;
  parts text[];
  major_part int;
  minor_part int;
  patch_part int;
begin
  new.body = btrim(new.body);

  select current_version into current
  from public.projects
  where id = new.project_id
  for update;

  if current is null then
    current := '0.1.0';
  end if;

  parts := string_to_array(current, '.');
  if array_length(parts, 1) <> 3 then
    raise exception 'Invalid current_version for project %: %', new.project_id, current;
  end if;

  major_part := parts[1]::int;
  minor_part := parts[2]::int;
  patch_part := parts[3]::int;

  if new.bump_type = 'major' then
    major_part := major_part + 1;
    minor_part := 0;
    patch_part := 0;
  elsif new.bump_type = 'minor' then
    minor_part := minor_part + 1;
    patch_part := 0;
  else
    patch_part := patch_part + 1;
  end if;

  new.version := format('%s.%s.%s', major_part, minor_part, patch_part);

  update public.projects
    set current_version = new.version
    where id = new.project_id;

  return new;
end;
$$;

-- Replace the body-only normalize trigger with the versioning trigger.
drop trigger if exists on_project_updates_normalized on public.project_updates;
drop trigger if exists on_project_updates_versioned on public.project_updates;

create trigger on_project_updates_versioned
  before insert on public.project_updates
  for each row execute function public.apply_project_update_version();

-- Updates after insert still need body normalization only.
create or replace function public.normalize_project_update_fields()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.body = btrim(new.body);
  return new;
end;
$$;

create trigger on_project_updates_normalized
  before update on public.project_updates
  for each row execute function public.normalize_project_update_fields();
