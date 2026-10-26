-- Exercises staged RLS and composite foreign key in an EPHEMERAL database.
-- No real users, provider keys, subscriptions or production connections.
insert into public.pf_v2_brands(id,owner_uid,name) values
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111','Owner A brand'),
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','22222222-2222-4222-8222-222222222222','Owner B brand');
insert into public.pf_v2_products
 (id,owner_uid,brand_id,name,category,price_centavos) values
 ('cccccccc-cccc-4ccc-8ccc-cccccccccccc','11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Producto A','food',19900),
 ('dddddddd-dddd-4ddd-8ddd-dddddddddddd','22222222-2222-4222-8222-222222222222','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','Producto B','home',12500);

-- Trusted backend cannot cross-link a product to a different owner's brand.
do $test$
begin
  begin
    insert into public.pf_v2_products(owner_uid,brand_id,name,category,price_centavos)
    values ('11111111-1111-4111-8111-111111111111',
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','Cross tenant','food',1);
    raise exception 'SECURITY_FAILURE: owner/brand cross-link was accepted';
  exception when foreign_key_violation then null;
  end;
end
$test$;

-- All browser writes denied even when the JWT belongs to the row owner.
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
do $test$
declare n integer;
begin
  select count(*) into n from public.pf_v2_brands;
  if n<>1 then raise exception 'SECURITY_FAILURE: A brand RLS count %',n; end if;
  select count(*) into n from public.pf_v2_products;
  if n<>1 then raise exception 'SECURITY_FAILURE: A product RLS count %',n; end if;
  if (select name from public.pf_v2_products limit 1)<>'Producto A' then
    raise exception 'SECURITY_FAILURE: A saw other owner product';
  end if;
  begin
    insert into public.pf_v2_brands(owner_uid,name)
      values ('11111111-1111-4111-8111-111111111111','Illegal direct browser write');
    raise exception 'SECURITY_FAILURE: authenticated INSERT allowed';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.pf_v2_products set price_centavos=0 where name='Producto A';
    raise exception 'SECURITY_FAILURE: authenticated UPDATE allowed';
  exception when insufficient_privilege then null;
  end;
  begin
    delete from public.pf_v2_products where name='Producto A';
    raise exception 'SECURITY_FAILURE: authenticated DELETE allowed';
  exception when insufficient_privilege then null;
  end;
end
$test$;

-- A different account sees only its own data.
set request.jwt.claim.sub = '22222222-2222-4222-8222-222222222222';
do $test$
declare n integer;
begin
  select count(*) into n from public.pf_v2_brands;
  if n<>1 then raise exception 'SECURITY_FAILURE: B brand RLS count %',n; end if;
  select count(*) into n from public.pf_v2_products;
  if n<>1 then raise exception 'SECURITY_FAILURE: B product RLS count %',n; end if;
  if (select name from public.pf_v2_products limit 1)<>'Producto B' then
    raise exception 'SECURITY_FAILURE: B saw other owner product';
  end if;
end
$test$;

-- Unknown authenticated user gets no data.
set request.jwt.claim.sub = '33333333-3333-4333-8333-333333333333';
do $test$
declare n integer;
begin
  select count(*) into n from public.pf_v2_products;
  if n<>0 then raise exception 'SECURITY_FAILURE: unknown user saw %',n; end if;
end
$test$;

-- Anonymous role has no SELECT grant even with a forged JWT claim.
reset role;
set role anon;
set request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
do $test$
begin
  begin
    perform count(*) from public.pf_v2_products;
    raise exception 'SECURITY_FAILURE: anonymous SELECT allowed';
  exception when insufficient_privilege then null;
  end;
end
$test$;
reset role;
