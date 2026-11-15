
update storage.buckets set public=false where id in ('citizen_photos','public_documents');

drop policy if exists "Public can view citizen photos" on storage.objects;
drop policy if exists "Public Access citizen_photos" on storage.objects;
drop policy if exists "Public Access public_documents" on storage.objects;
drop policy if exists "Public can view public documents" on storage.objects;

create policy "Authenticated staff read staged documents"
on storage.objects for select to authenticated
using (bucket_id='public_documents' and public.has_staff_role(array['ADMIN','MODERATOR','DATA_MANAGER']));

create policy "Authenticated staff upload staged documents"
on storage.objects for insert to authenticated
with check (bucket_id='public_documents' and public.has_staff_role(array['ADMIN','MODERATOR','DATA_MANAGER']));

create policy "Authenticated staff update staged documents"
on storage.objects for update to authenticated
using (bucket_id='public_documents' and public.has_staff_role(array['ADMIN','MODERATOR','DATA_MANAGER']))
with check (bucket_id='public_documents' and public.has_staff_role(array['ADMIN','MODERATOR','DATA_MANAGER']));

create policy "Authenticated staff delete staged documents"
on storage.objects for delete to authenticated
using (bucket_id='public_documents' and public.has_staff_role(array['ADMIN','DATA_MANAGER']));

create policy "Staff read citizen evidence"
on storage.objects for select to authenticated
using (bucket_id='citizen_photos' and public.has_staff_role(array['ADMIN','MODERATOR','DATA_MANAGER']));
