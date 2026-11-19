begin;
create or replace function public.document_delivery_metric() returns text language sql stable security invoker set search_path='' as $$ select 'SERVER_FILE_DELIVERY_V1'::text $$;
revoke all on function public.document_delivery_metric() from public;
grant execute on function public.document_delivery_metric() to anon,authenticated;
drop trigger if exists enforce_document_publication_audit_trigger on public.public_documents;
drop trigger if exists enforce_document_publication_audit_update on public.public_documents;
create trigger enforce_document_publication_audit_trigger before insert on public.public_documents
for each row execute function public.enforce_document_publication_audit();
create trigger enforce_document_publication_audit_update before update on public.public_documents
for each row when (not private.admin_is_delivery_update(to_jsonb(old),to_jsonb(new))) execute function public.enforce_document_publication_audit();

create table if not exists private.document_delivery_receipts (
  document_id text not null references public.public_documents(id),
  request_id uuid not null,
  storage_path text not null,
  checksum_sha256 text not null,
  client_hash text not null,
  created_at timestamptz not null default clock_timestamp(),
  primary key(document_id,request_id)
);
create index if not exists document_delivery_rate on private.document_delivery_receipts(client_hash,created_at);
revoke all on private.document_delivery_receipts from public,anon,authenticated,service_role;

create or replace function public.record_document_delivery(p_document_id text,p_request_id uuid,p_storage_path text,p_checksum text,p_client_hash text)
returns bigint language plpgsql security definer set search_path='' as $$
declare doc public.public_documents; prior private.document_delivery_receipts; result bigint;
begin
  if current_setting('role',true)<>'service_role' then raise exception 'Server delivery only'; end if;
  if p_request_id is null or p_client_hash is null or p_client_hash !~ '^[a-f0-9]{64}$' or p_checksum is null or p_checksum !~ '^[a-f0-9]{64}$' then raise exception 'Invalid delivery reference'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_client_hash,0));
  select * into doc from public.public_documents where id=p_document_id and status='PUBLISHED' and verification_status='VERIFIED' for update;
  if not found then raise exception 'Published document required'; end if;
  if not exists(select 1 from storage.objects where bucket_id='public_documents' and name=p_storage_path) or not coalesce((
    (not coalesce(doc.is_multipart,false) and doc.storage_path=p_storage_path and doc.checksum_sha256=p_checksum)
    or (doc.is_multipart and exists(select 1 from jsonb_array_elements(doc.document_parts) p where p->>'storage_path'=p_storage_path and p->>'checksum_sha256'=p_checksum and p->>'status'='VERIFIED' and p->>'checksum_status'='COMPUTED' and p->>'page_range_verified'='true'))
  ),false) then raise exception 'Original mismatch'; end if;
  select * into prior from private.document_delivery_receipts where document_id=p_document_id and request_id=p_request_id;
  if found then
    if prior.storage_path<>p_storage_path or prior.checksum_sha256<>p_checksum or prior.client_hash<>p_client_hash then raise exception 'Delivery request conflict'; end if;
    return doc.downloads_count;
  end if;
  if (select count(*) from private.document_delivery_receipts where client_hash=p_client_hash and created_at>clock_timestamp()-interval '1 minute')>=20 then raise exception 'Delivery rate limit'; end if;
  insert into private.document_delivery_receipts(document_id,request_id,storage_path,checksum_sha256,client_hash) values(p_document_id,p_request_id,p_storage_path,p_checksum,p_client_hash);
  update public.public_documents set downloads_count=coalesce(downloads_count,0)+1 where id=doc.id returning downloads_count into result;
  delete from private.document_delivery_receipts where created_at<clock_timestamp()-interval '24 hours';
  return result;
end $$;
revoke all on function public.record_document_delivery(text,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.record_document_delivery(text,uuid,text,text,text) to service_role;
revoke update on public.public_documents from anon,authenticated;
do $$ declare columns_sql text;
begin
  select string_agg(quote_ident(column_name),',') into columns_sql from information_schema.columns
    where table_schema='public' and table_name='public_documents' and column_name<>'downloads_count';
  execute 'grant update(' || columns_sql || ') on public.public_documents to authenticated';
end $$;
notify pgrst,'reload schema';
commit;
