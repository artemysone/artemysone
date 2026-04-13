-- Artemys initial schema
-- Baseline for all core tables, triggers, policies, and seed data.

begin;

create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  name text not null,
  handle text not null unique,
  avatar_url text,
  bio text default '' not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,

  constraint profile_name_not_blank check (char_length(btrim(name)) > 0),
  constraint handle_format check (handle ~ '^[a-z0-9_]{3,30}$')
);

create table public.projects (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  description text default '' not null,
  media_url text,
  media_type text default 'image' not null check (media_type in ('image', 'video')),
  thumbnail_url text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,

  constraint project_title_not_blank check (char_length(btrim(title)) > 0)
);

create table public.tags (
  id uuid default gen_random_uuid() primary key,
  name text not null unique
);

create table public.project_tags (
  project_id uuid references public.projects(id) on delete cascade not null,
  tag_id uuid references public.tags(id) on delete cascade not null,
  primary key (project_id, tag_id)
);

create table public.collaborators (
  project_id uuid references public.projects(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  role text default '' not null,
  created_at timestamptz default now() not null,
  primary key (project_id, user_id)
);

create table public.follows (
  follower_id uuid references public.profiles(id) on delete cascade not null,
  following_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz default now() not null,
  primary key (follower_id, following_id),

  constraint no_self_follow check (follower_id != following_id)
);

create table public.likes (
  user_id uuid references public.profiles(id) on delete cascade not null,
  project_id uuid references public.projects(id) on delete cascade not null,
  created_at timestamptz default now() not null,
  primary key (user_id, project_id)
);

create table public.comments (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  text text not null,
  created_at timestamptz default now() not null,

  constraint comment_text_not_blank check (char_length(btrim(text)) > 0)
);

create index idx_projects_user_id on public.projects(user_id);
create index idx_projects_created_at on public.projects(created_at desc);
create index idx_project_tags_tag_id on public.project_tags(tag_id);
create index idx_collaborators_user_id on public.collaborators(user_id);
create index idx_follows_following_id on public.follows(following_id);
create index idx_likes_project_id on public.likes(project_id);
create index idx_comments_project_id on public.comments(project_id);

create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

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

create trigger on_profiles_updated
  before update on public.profiles
  for each row execute function public.handle_updated_at();

create trigger on_projects_updated
  before update on public.projects
  for each row execute function public.handle_updated_at();

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.tags enable row level security;
alter table public.project_tags enable row level security;
alter table public.collaborators enable row level security;
alter table public.follows enable row level security;
alter table public.likes enable row level security;
alter table public.comments enable row level security;

create policy "Profiles are viewable by everyone"
  on public.profiles for select using (true);

create policy "Users can update their own profile"
  on public.profiles for update using (auth.uid() = id);

create policy "Projects are viewable by everyone"
  on public.projects for select using (true);

create policy "Users can create projects"
  on public.projects for insert with check (auth.uid() = user_id);

create policy "Users can update their own projects"
  on public.projects for update using (auth.uid() = user_id);

create policy "Users can delete their own projects"
  on public.projects for delete using (auth.uid() = user_id);

create policy "Tags are viewable by everyone"
  on public.tags for select using (true);

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

create policy "Follows are viewable by everyone"
  on public.follows for select using (true);

create policy "Users can follow others"
  on public.follows for insert with check (auth.uid() = follower_id);

create policy "Users can unfollow"
  on public.follows for delete using (auth.uid() = follower_id);

create policy "Likes are viewable by everyone"
  on public.likes for select using (true);

create policy "Users can like projects"
  on public.likes for insert with check (auth.uid() = user_id);

create policy "Users can unlike projects"
  on public.likes for delete using (auth.uid() = user_id);

create policy "Comments are viewable by everyone"
  on public.comments for select using (true);

create policy "Authenticated users can comment"
  on public.comments for insert with check (auth.uid() = user_id);

create policy "Users can delete their own comments"
  on public.comments for delete using (auth.uid() = user_id);

insert into public.tags (name) values
  ('Design'),
  ('Mobile'),
  ('Web'),
  ('AI / ML'),
  ('Hardware'),
  ('Music'),
  ('Film'),
  ('Games')
on conflict (name) do nothing;

commit;
