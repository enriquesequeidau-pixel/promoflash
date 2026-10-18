-- Ejecutar en el SQL Editor de Supabase. No exponer credenciales service_role.
create table if not exists public.waitlist (
 id bigint generated always as identity primary key,
 email text not null,
 business text not null default '',
 source text not null default 'landing',
 utm_campaign text not null default '',
 utm_medium text not null default '',
 created_at timestamptz not null default now(),
 constraint email_length check (length(email) between 3 and 254),
 constraint business_length check (length(business) <= 90),
 constraint utm_campaign_length check (length(utm_campaign) <= 80),
 constraint utm_medium_length check (length(utm_medium) <= 50)
);
create unique index if not exists waitlist_email_unique on public.waitlist (lower(email));
alter table public.waitlist enable row level security;
-- Solo permitir INSERT anónimo, nunca SELECT/UPDATE/DELETE.
revoke all on public.waitlist from anon, authenticated;
grant insert on public.waitlist to anon;
create policy "Public waitlist signup" on public.waitlist
  for insert to anon with check (source = 'landing' and length(email) between 3 and 254 and length(business) <= 90 and length(utm_campaign) <= 80 and length(utm_medium) <= 50);
-- Recomendado para uso público: CAPTCHA + rate limiting via función de servidor;
-- este MVP básico NO incluye protección anti-spam robusta.
