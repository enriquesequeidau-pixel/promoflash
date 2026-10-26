-- PromoFlash v2 / PHASE 1 ONLY — reviewable, NOT APPLIED to Supabase.
-- IMPORTANT: shared production database also serves other MicroApps.
-- Execute ONLY against an isolated, backed-up test database after review.
-- Do NOT enable paid checkout, expose writes to browsers or deploy this file.
-- Quotas and fresh paid entitlements MUST be enforced in server transactions
-- before any insert/update/delete by a trusted service-role backend.
--
-- Why read-only browser access? Free users who lose paid rights can still
-- retrieve their own previously saved products without deleting them.
-- Anonymous Free Studio never imports or calls these tables.

begin;

create table public.pf_v2_brands (
  id uuid primary key default gen_random_uuid(),
  owner_uid uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  primary_color text not null default '#232841'
    check (primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  secondary_color text not null default '#FFFFFF'
    check (secondary_color ~ '^#[0-9A-Fa-f]{6}$'),
  accent_color text not null default '#596BDB'
    check (accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  phone text not null default '' check (char_length(phone) <= 30),
  commercial_url text not null default '' check (char_length(commercial_url) <= 500),
  style text not null default 'catalog'
    check (style in ('soft','editorial','pop','bloom','neon','catalog','noir','citrus','market')),
  logo_asset_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, owner_uid)
);

create table public.pf_v2_products (
  id uuid primary key default gen_random_uuid(),
  owner_uid uuid not null references auth.users(id) on delete cascade,
  brand_id uuid not null,
  name text not null check (char_length(name) between 1 and 80),
  description text not null default '' check (char_length(description) <= 500),
  category text not null check (category in ('beauty','fashion','jewelry','food','home')),
  price_centavos integer not null check (price_centavos between 0 and 100000000),
  currency text not null default 'MXN' check (currency = 'MXN'),
  photo_asset_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pf_v2_products_owner_brand_fk foreign key (brand_id, owner_uid)
    references public.pf_v2_brands (id, owner_uid) on delete restrict
);

create index pf_v2_brands_owner_idx on public.pf_v2_brands(owner_uid);
create index pf_v2_products_owner_brand_idx
  on public.pf_v2_products(owner_uid, brand_id);

-- Existing projects can grant public API access to all new public tables.
-- Revoke explicitly before creating policies and opting in to SELECT.
revoke all on table public.pf_v2_brands, public.pf_v2_products
  from public, anon, authenticated;

alter table public.pf_v2_brands enable row level security;
alter table public.pf_v2_products enable row level security;

-- No browser INSERT/UPDATE/DELETE. Mutations require a future trusted backend
-- that verifies session, owner, paid plan, relationships and quotas atomically.
grant select on table public.pf_v2_brands, public.pf_v2_products to authenticated;

create policy pf_v2_brands_select_owner on public.pf_v2_brands
  for select to authenticated
  using (owner_uid = (select auth.uid()));

create policy pf_v2_products_select_owner on public.pf_v2_products
  for select to authenticated
  using (owner_uid = (select auth.uid()));

-- The server-only role can access the tables after validating each request.
-- NEVER put its credentials in browser code or configure direct unverified writes.
grant select, insert, update, delete on table
  public.pf_v2_brands, public.pf_v2_products to service_role;

-- No policy grants writes to anon/authenticated. Service-role backend must
-- recheck identity, subscription, quotas and private photo ownership.
commit;
