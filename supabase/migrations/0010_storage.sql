-- 0010 — private storage buckets.
-- Path convention: <campus_id>/<entity>/<id>/<filename>, so the bucket policy can
-- reuse the same campus claim the tables use.

insert into storage.buckets (id, name, public, file_size_limit)
values
  ('documents', 'documents', false, 20971520),
  ('photos',    'photos',    false, 5242880),
  ('generated', 'generated', false, 20971520)
on conflict (id) do nothing;

create policy documents_read on storage.objects for select to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = any (select unnest(public.auth_campus_ids())::text)
  );

create policy documents_write on storage.objects for insert to authenticated
  with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = any (select unnest(public.auth_campus_ids())::text)
    and public.auth_has_role('CA','SA','AO','FAC')
  );

create policy photos_read on storage.objects for select to authenticated
  using (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = any (select unnest(public.auth_campus_ids())::text)
  );

create policy generated_read on storage.objects for select to authenticated
  using (
    bucket_id = 'generated'
    and (storage.foldername(name))[1] = any (select unnest(public.auth_campus_ids())::text)
  );
