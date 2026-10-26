-- PostgreSQL 17 integration assertions, all identities are synthetic.
-- Do not run against any live or shared database.
insert into public.pf_v2_plan_access
  (owner_uid, plan, source, provider_event_id, verified_at, valid_until)
values
  ('11111111-1111-4111-8111-111111111111','pro',
   'provider_verified','FAKE_PRO_EVENT_001','2026-10-24T00:00:00Z','2099-01-01T00:00:00Z'),
  ('22222222-2222-4222-8222-222222222222','business',
   'provider_verified','FAKE_BIZ_EVENT_002','2026-10-24T00:00:00Z','2099-01-01T00:00:00Z');

-- Neither anonymous nor authenticated users can read entitlements or call
-- the service-only write function, even with a known brand UUID.
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
do $test$
begin
  begin
    perform count(*) from public.pf_v2_plan_access;
    raise exception 'SECURITY_FAILURE: entitlement leaked';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.pf_v2_create_product_trusted(
      '11111111-1111-4111-8111-111111111111',
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Unauthorized','food',1);
    raise exception 'SECURITY_FAILURE: client invoked write function';
  exception when insufficient_privilege then null;
  end;
end
$test$;
reset role;

-- Verified service-only write uses trusted account and plan.
set role service_role;
do $test$
declare product_id uuid;
begin
  product_id := public.pf_v2_create_product_trusted(
    '11111111-1111-4111-8111-111111111111',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'Servicio seguro','food',19900);
  if product_id is null then
    raise exception 'SECURITY_FAILURE: missing product ID';
  end if;
end
$test$;

-- Cross-tenant product cannot attach another owner's brand.
do $test$
begin
  begin
    perform public.pf_v2_create_product_trusted(
      '11111111-1111-4111-8111-111111111111',
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','Cross-tenant','food',1);
    raise exception 'SECURITY_FAILURE: cross-tenant brand accepted';
  exception when foreign_key_violation then null;
  end;
end
$test$;

-- Photo owner checks are not shipped: fail closed rather than save unsafe ID.
do $test$
begin
  begin
    perform public.pf_v2_create_product_trusted(
      '11111111-1111-4111-8111-111111111111',
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Foto insegura','food',1,'',
      'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee');
    raise exception 'SECURITY_FAILURE: unverified photo accepted';
  exception when raise_exception then
    if SQLERRM <> 'PHOTO_NOT_READY' then raise; end if;
  end;
end
$test$;

-- Fill Pro to exactly 50 products (two existed: one in original fixture,
-- one from the trusted call above). Then deny the 51st atomically.
do $test$
declare i integer; n integer;
begin
  for i in 1..48 loop
    perform public.pf_v2_create_product_trusted(
      '11111111-1111-4111-8111-111111111111',
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      'Producto ' || i, 'food', 100);
  end loop;
  select count(*) into n from public.pf_v2_products
    where owner_uid='11111111-1111-4111-8111-111111111111';
  if n<>50 then raise exception 'SECURITY_FAILURE: Pro product count %', n; end if;
  begin
    perform public.pf_v2_create_product_trusted(
      '11111111-1111-4111-8111-111111111111',
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','El 51','food',100);
    raise exception 'SECURITY_FAILURE: 51st product accepted';
  exception when raise_exception then
    if SQLERRM <> 'PRODUCT_QUOTA' then raise; end if;
  end;
end
$test$;

-- Downgrades and expiry must block writes without deleting existing data.
update public.pf_v2_plan_access set plan='free'
  where owner_uid='11111111-1111-4111-8111-111111111111';
do $test$
declare n integer;
begin
  begin
    perform public.pf_v2_create_product_trusted(
      '11111111-1111-4111-8111-111111111111',
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Free denied','food',1);
    raise exception 'SECURITY_FAILURE: Free created product';
  exception when raise_exception then
    if SQLERRM <> 'PLAN_REQUIRED' then raise; end if;
  end;
  select count(*) into n from public.pf_v2_products
    where owner_uid='11111111-1111-4111-8111-111111111111';
  if n<>50 then raise exception 'SECURITY_FAILURE: downgrade deleted data'; end if;
end
$test$;

update public.pf_v2_plan_access set valid_until=clock_timestamp()-interval '1 second'
  where owner_uid='22222222-2222-4222-8222-222222222222';
do $test$
begin
  begin
    perform public.pf_v2_create_product_trusted(
      '22222222-2222-4222-8222-222222222222',
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','Expired','home',1);
    raise exception 'SECURITY_FAILURE: expired plan permitted';
  exception when raise_exception then
    if SQLERRM <> 'PLAN_REQUIRED' then raise; end if;
  end;
end
$test$;

-- Free retains owner-scoped read access after downgrade.
reset role;
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
do $test$
declare n integer;
begin
  select count(*) into n from public.pf_v2_products;
  if n<>50 then raise exception 'SECURITY_FAILURE: data lost after downgrade %',n; end if;
end
$test$;
reset role;

-- Contractual quota enforcement is intended for all backend create paths.
-- This harness does not assert a complete merchant reconciliation or E2E UI.
