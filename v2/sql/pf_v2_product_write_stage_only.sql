-- PromoFlash v2 / STAGING ONLY. Apply ONLY to disposable PostgreSQL QA.
-- NOT APPLIED to Supabase or a live payment provider.
-- Service caller MUST independently verify the Supabase session and derive
-- p_owner_uid from the verified identity, never from client JSON.
-- Entitlement rows MUST come from verified server-side provider reconciliation.
-- This is NOT an HTTP endpoint; without that server handler it is not launchable.
begin;

create table public.pf_v2_plan_access (
  owner_uid uuid primary key references auth.users(id) on delete cascade,
  plan text not null check (plan in ('free','pro','business')),
  source text not null check (source = 'provider_verified'),
  provider_event_id text not null
    check (char_length(provider_event_id) between 12 and 160),
  verified_at timestamptz not null,
  valid_until timestamptz not null,
  updated_at timestamptz not null default now(),
  check (valid_until > verified_at)
);

-- Defense in depth: no browser can read or forge paid entitlement rows.
revoke all on table public.pf_v2_plan_access from public, anon, authenticated;
alter table public.pf_v2_plan_access enable row level security;
grant select, insert, update, delete on public.pf_v2_plan_access to service_role;

-- Security INVOKER only; service_role permission + RLS bypass by that
-- server role applies. No SECURITY DEFINER bypass or public execution.
create function public.pf_v2_create_product_trusted(
  p_owner_uid uuid,
  p_brand_id uuid,
  p_name text,
  p_category text,
  p_price_centavos integer,
  p_description text default '',
  p_photo_asset_id uuid default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $fn$
declare
  verified_plan text;
  product_limit integer;
  product_count integer;
  inserted_id uuid;
begin
  if current_user <> 'service_role' or p_owner_uid is null then
    raise exception 'UNAUTHORIZED' using errcode='42501';
  end if;
  -- Serializes quota checks across concurrent service instances, not just
  -- one Node process. Must be used by ALL trusted catalog creation paths.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_owner_uid::text, 722021)
  );
  select plan into verified_plan
    from public.pf_v2_plan_access
    where owner_uid = p_owner_uid
      and source = 'provider_verified'
      and verified_at <= pg_catalog.clock_timestamp()
      and valid_until > pg_catalog.clock_timestamp();
  if verified_plan not in ('pro','business') or verified_plan is null then
    raise exception 'PLAN_REQUIRED' using errcode='P0001';
  end if;

  -- Private photo storage and owner validation are not integrated yet.
  -- Deny links until the trusted photo adapter is implemented.
  if p_photo_asset_id is not null then
    raise exception 'PHOTO_NOT_READY' using errcode='P0001';
  end if;
  if p_name is null or pg_catalog.btrim(p_name) = '' then
    raise exception 'INVALID_PRODUCT' using errcode='22023';
  end if;
  product_limit := case verified_plan when 'pro' then 50 else 250 end;
  select count(*) into product_count
    from public.pf_v2_products where owner_uid = p_owner_uid;
  if product_count >= product_limit then
    raise exception 'PRODUCT_QUOTA' using errcode='P0001';
  end if;

  -- The composite (brand_id, owner_uid) foreign key rejects cross-tenant
  -- attachment even when a caller knows someone else's brand UUID.
  insert into public.pf_v2_products
    (owner_uid,brand_id,name,category,price_centavos,description,photo_asset_id)
  values
    (p_owner_uid,p_brand_id,p_name,p_category,p_price_centavos,
     coalesce(p_description,''),null)
  returning id into inserted_id;
  return inserted_id;
end;
$fn$;

revoke all on function public.pf_v2_create_product_trusted(
  uuid,uuid,text,text,integer,text,uuid
) from public, anon, authenticated;
grant execute on function public.pf_v2_create_product_trusted(
  uuid,uuid,text,text,integer,text,uuid
) to service_role;

commit;
