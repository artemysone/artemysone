-- Artemys V1 Storage Buckets
-- Run this in the Supabase SQL Editor after schema.sql

-- Create storage buckets
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true);
insert into storage.buckets (id, name, public) values ('project-media', 'project-media', true);

-- Avatars: anyone can view, authenticated users can upload/update their own
create policy "Avatar images are publicly accessible"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "Users can upload their own avatar"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can update their own avatar"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Project media: anyone can view, authenticated users can upload to their own folder
create policy "Project media is publicly accessible"
  on storage.objects for select
  using (bucket_id = 'project-media');

create policy "Users can upload project media"
  on storage.objects for insert
  with check (
    bucket_id = 'project-media'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can update their own project media"
  on storage.objects for update
  using (
    bucket_id = 'project-media'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete their own project media"
  on storage.objects for delete
  using (
    bucket_id = 'project-media'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
