-- Artemys project progression layer
-- Adds append-only project updates for visible work progression.

-- ============================================================
-- PROJECT UPDATES
-- ============================================================

create table public.project_updates (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  body text default '' not null,
  created_at timestamptz default now() not null,

  constraint project_updates_body_not_blank check (char_length(btrim(body)) > 0)
);

create index idx_project_updates_project_id_created_at
  on public.project_updates(project_id, created_at desc);

create index idx_project_updates_user_id_created_at
  on public.project_updates(user_id, created_at desc);

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

drop trigger if exists on_project_updates_normalized on public.project_updates;

create trigger on_project_updates_normalized
  before insert or update on public.project_updates
  for each row execute function public.normalize_project_update_fields();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.project_updates enable row level security;

drop policy if exists "Project updates are viewable by everyone" on public.project_updates;
create policy "Project updates are viewable by everyone"
  on public.project_updates for select using (true);

drop policy if exists "Project owners and authors can create project updates" on public.project_updates;
create policy "Project owners and authors can create project updates"
  on public.project_updates for insert
  with check (
    auth.uid() = user_id
    and auth.uid() = (select user_id from public.projects where id = project_id)
  );

drop policy if exists "Project owners and authors can delete project updates" on public.project_updates;
create policy "Project owners and authors can delete project updates"
  on public.project_updates for delete
  using (
    auth.uid() = user_id
    or auth.uid() = (select user_id from public.projects where id = project_id)
  );
