alter table public.waitlist add column if not exists utm_campaign text not null default '';
alter table public.waitlist add column if not exists utm_medium text not null default '';
