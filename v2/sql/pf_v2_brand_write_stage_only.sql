-- STAGING ONLY: transactional branded identity creation, NOT applied to live DB.
-- Service caller must verify Supabase user and derive owner UID from trusted auth.
-- Paid provider entitlement must be reconciled and written by an approved backend.
-- This function is NOT an endpoint and cannot independently prove a payment.
begin;
create function public.pf_v2_create_brand_trusted(
  p_owner_uid uuid,
  p_name text,
  p_primary_color text default '#232841',
  p_secondary_color text default '#FFFFFF',
  p_accent_color text default '#596BDB',
  p_phone text default '',
  p_commercial_url text default '',
  p_style text default 'catalog',
  p_logo_asset_id uuid default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $fn$
declare
  verified_plan text;
  brand_limit integer;
  brand_count integer;
  inserted_id uuid;
begin
  if current_user <> 'service_role' or p_owner_uid is null then
    raise exception 'UNAUTHORIZED' using errcode='42501';
  end if;
  -- Use SAME per-owner lock as product creation for predictable quota reads.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_owner_uid::text, 722021)
  );
  select plan into verified_plan
    from public.pf_v2_plan_access
    where owner_uid=p_owner_uid and source='provider_verified'
      and verified_at<=pg_catalog.clock_timestamp()
      and valid_until>pg_catalog.clock_timestamp();
  if verified_plan is null or verified_plan not in ('pro','business') then
    raise exception 'PLAN_REQUIRED' using errcode='P0001';
  end if;
  if p_logo_asset_id is not null then
    -- Private image ownership proof is not implemented: fail closed.
    raise exception 'LOGO_NOT_READY' using errcode='P0001';
  end if;
  brand_limit := case verified_plan when 'pro' then 1 else 5 end;
  select count(*) into brand_count from public.pf_v2_brands
    where owner_uid=p_owner_uid;
  if brand_count >= brand_limit then
    raise exception 'BRAND_QUOTA' using errcode='P0001';
  end if;
  if p_name is null or pg_catalog.btrim(p_name)='' then
    raise exception 'INVALID_BRAND' using errcode='22023';
  end if;
  insert into public.pf_v2_brands
    (owner_uid,name,primary_color,secondary_color,accent_color,
     phone,commercial_url,style,logo_asset_id)
  values
    (p_owner_uid,p_name,p_primary_color,p_secondary_color,p_accent_color,
     coalesce(p_phone,''),coalesce(p_commercial_url,''),p_style,null)
  returning id into inserted_id;
  return inserted_id;
end;
$fn$;
revoke all on function public.pf_v2_create_brand_trusted(
  uuid,text,text,text,text,text,text,text,uuid
) from public, anon, authenticated;
grant execute on function public.pf_v2_create_brand_trusted(
  uuid,text,text,text,text,text,text,text,uuid
) to service_role;
commit;
