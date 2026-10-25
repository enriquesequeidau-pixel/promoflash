-- Must run after product write SQL tests on synthetic PostgreSQL only.
-- Owner A: 1 brand, Free after downgrade. Owner B: 1 brand, expired Business.
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
do $test$
begin
  begin
    perform public.pf_v2_create_brand_trusted(
      '11111111-1111-4111-8111-111111111111','Forbidden');
    raise exception 'SECURITY_FAILURE: browser invoked trusted brand RPC';
  exception when insufficient_privilege then null;
  end;
end
$test$;
reset role;
set role service_role;
do $test$
begin
  begin
    perform public.pf_v2_create_brand_trusted(
      '11111111-1111-4111-8111-111111111111','Free forbidden');
    raise exception 'SECURITY_FAILURE: Free brand allowed';
  exception when raise_exception then
    if SQLERRM <> 'PLAN_REQUIRED' then raise; end if;
  end;
end
$test$;
update public.pf_v2_plan_access set plan='pro',
  valid_until='2099-01-01T00:00:00Z'
  where owner_uid='11111111-1111-4111-8111-111111111111';
do $test$
begin
  begin
    perform public.pf_v2_create_brand_trusted(
      '11111111-1111-4111-8111-111111111111','Pro second brand');
    raise exception 'SECURITY_FAILURE: second Pro brand accepted';
  exception when raise_exception then
    if SQLERRM <> 'BRAND_QUOTA' then raise; end if;
  end;
end
$test$;

update public.pf_v2_plan_access set plan='business',
  valid_until='2099-01-01T00:00:00Z'
  where owner_uid='22222222-2222-4222-8222-222222222222';
do $test$
declare n integer; k integer; created uuid;
begin
  for k in 1..4 loop
    created:=public.pf_v2_create_brand_trusted(
      '22222222-2222-4222-8222-222222222222',
      'Brand '||k,'#012345','#FFFFFF','#AABBCC','','','catalog');
    if created is null then raise exception 'SECURITY_FAILURE: missing brand UUID'; end if;
  end loop;
  select count(*) into n from public.pf_v2_brands
    where owner_uid='22222222-2222-4222-8222-222222222222';
  if n<>5 then raise exception 'SECURITY_FAILURE: expected 5 Business brands, got %',n; end if;
  begin
    perform public.pf_v2_create_brand_trusted(
      '22222222-2222-4222-8222-222222222222','Sixth brand');
    raise exception 'SECURITY_FAILURE: sixth Business brand allowed';
  exception when raise_exception then
    if SQLERRM <> 'BRAND_QUOTA' then raise; end if;
  end;
end
$test$;

-- The server cannot bypass the not-yet-implemented private logo checks.
delete from public.pf_v2_brands
  where owner_uid='22222222-2222-4222-8222-222222222222'
    and name='Brand 4';
do $test$
begin
  begin
    perform public.pf_v2_create_brand_trusted(
      '22222222-2222-4222-8222-222222222222',
      'Logo without proof',p_logo_asset_id=>
       'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee');
    raise exception 'SECURITY_FAILURE: unverified brand logo accepted';
  exception when raise_exception then
    if SQLERRM <> 'LOGO_NOT_READY' then raise; end if;
  end;
end
$test$;

-- Expired plans fail closed without deleting brands.
update public.pf_v2_plan_access
  set valid_until=clock_timestamp()-interval '1 second'
  where owner_uid='22222222-2222-4222-8222-222222222222';
do $test$
declare n integer;
begin
  begin
    perform public.pf_v2_create_brand_trusted(
      '22222222-2222-4222-8222-222222222222','Expired brand');
    raise exception 'SECURITY_FAILURE: expired Business allowed';
  exception when raise_exception then
    if SQLERRM <> 'PLAN_REQUIRED' then raise; end if;
  end;
  select count(*) into n from public.pf_v2_brands
    where owner_uid='22222222-2222-4222-8222-222222222222';
  if n<>4 then raise exception 'SECURITY_FAILURE: expired plan deleted brands'; end if;
end
$test$;
reset role;
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
do $test$
declare n integer;
begin
  select count(*) into n from public.pf_v2_brands;
  if n<>1 then raise exception 'SECURITY_FAILURE: foreign brands visible to A'; end if;
end
$test$;
reset role;
