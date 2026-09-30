begin;

-- The public API exposes a fixed projection; granting base-table SELECT would expose private columns.
create or replace function private.published_citizen_proofs()
returns table (
  id text, project_id text, project_title text, commune_name text, region_name text,
  citizen_name text, image_url text, video_url text, media_type text,
  citizen_status_claim text, comment text, locality_details text,
  geo_latitude numeric, geo_longitude numeric, verification_status text,
  confirmations_count integer, created_at timestamptz, updated_at timestamptz,
  signboard_status text, secondary_image_url text, verified_at timestamptz,
  source_url text, source_credit text, additional_photos text[]
)
language sql stable security definer set search_path = ''
as $$
  select p.id, p.project_id, p.project_title, p.commune_name, p.region_name,
    'Citoyen observateur'::text, p.image_url, p.video_url, p.media_type,
    p.citizen_status_claim, p.comment, p.locality_details,
    p.geo_latitude, p.geo_longitude, p.verification_status,
    p.confirmations_count, p.created_at, p.updated_at,
    p.signboard_status, p.secondary_image_url, p.verified_at,
    p.source_url, p.source_credit, p.additional_photos
  from public.citizen_proofs p
  where p.verification_status = 'APPROVED'
$$;
revoke all on function private.published_citizen_proofs() from public;
grant usage on schema private to anon, authenticated;
grant execute on function private.published_citizen_proofs() to anon, authenticated;

create or replace view public.public_citizen_proofs
with (security_invoker = true, security_barrier = true) as
select id, project_id, project_title, commune_name, region_name, citizen_name,
  image_url, video_url, media_type, citizen_status_claim, comment, locality_details,
  geo_latitude::numeric(10,7) as geo_latitude, geo_longitude::numeric(10,7) as geo_longitude,
  verification_status, confirmations_count, created_at, updated_at, signboard_status,
  secondary_image_url, verified_at, source_url, source_credit, additional_photos
from private.published_citizen_proofs();
revoke all on public.public_citizen_proofs from public, anon, authenticated;
grant select on public.public_citizen_proofs to anon, authenticated;

commit;
