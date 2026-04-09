-- Artemys V1 Storage Buckets
-- Run this in the Supabase SQL Editor after schema.sql

-- Create storage buckets
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true);
insert into storage.buckets (id, name, public) values ('project-media', 'project-media', true);

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

-- Avatars: anyone can view, authenticated users can upload/update their own
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

-- Project media: anyone can view, authenticated users can upload to their own folder
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
