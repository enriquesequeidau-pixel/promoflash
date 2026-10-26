-- Isolated ephemeral PostgreSQL test harness. Never point this at Supabase.
-- Synthetic roles and auth.uid() stand in for Supabase's environment.
create role anon nologin;
create role authenticated nologin;
-- Match Supabase server role semantics inside this disposable PostgreSQL only.
create role service_role nologin bypassrls;
create schema auth;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid
language sql stable as $auth_uid$
  select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid
$auth_uid$;

grant usage on schema public to authenticated, anon, service_role;
grant usage on schema auth to authenticated, anon;
grant execute on function auth.uid() to authenticated;
insert into auth.users(id) values
 ('11111111-1111-4111-8111-111111111111'),
 ('22222222-2222-4222-8222-222222222222');
