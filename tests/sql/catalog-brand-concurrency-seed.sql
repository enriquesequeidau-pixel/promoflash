-- Staging concurrency seed: after catalog-brand-write-assertions.sql.
-- Fabricated Business account B retains exactly 4 brand records.
set role service_role;
update public.pf_v2_plan_access
  set plan='business',valid_until='2099-01-01T00:00:00Z'
  where owner_uid='22222222-2222-4222-8222-222222222222';
do $test$
declare n integer;
begin
  select count(*) into n from public.pf_v2_brands
    where owner_uid='22222222-2222-4222-8222-222222222222';
  if n<>4 then raise exception 'Expected 4 Business brands before race, got %',n; end if;
end
$test$;
reset role;
