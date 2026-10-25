-- Concurrency-only fixture. Run AFTER catalog-product-write-assertions.sql
-- in the same disposable PostgreSQL database. No production access.
set role service_role;
update public.pf_v2_plan_access
  set plan='pro',valid_until='2099-01-01T00:00:00Z'
  where owner_uid='11111111-1111-4111-8111-111111111111';
delete from public.pf_v2_products
  where id=(
    select id from public.pf_v2_products
    where owner_uid='11111111-1111-4111-8111-111111111111'
    order by id limit 1
  );
do $test$
declare n integer;
begin
  select count(*) into n from public.pf_v2_products
    where owner_uid='11111111-1111-4111-8111-111111111111';
  if n<>49 then raise exception 'Expected 49 before concurrency: %', n; end if;
end
$test$;
reset role;
