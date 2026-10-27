-- PromoFlash campaign drafts: STAGING-ONLY proposal. DO NOT APPLY IN PRODUCTION.
-- Depends on the text-only catalog migration in PR #26. No plan entitlements,
-- payments, publications, scheduling jobs, photographs or public API access.
BEGIN;

-- Fail before any DDL if the catalog has not been deployed in the test database.
DO $$
BEGIN
  IF to_regclass('public.pf_catalog_items') IS NULL THEN
    RAISE EXCEPTION 'pf_catalog_items must exist before campaign drafts';
  END IF;
END;
$$;

-- A previous or manually created table may have weaker constraints/policies.
-- CREATE TABLE IF NOT EXISTS would silently reuse it, so require explicit
-- inspection/migration rather than claiming this script hardened it.
DO $$
BEGIN
  IF to_regclass('public.pf_campaign_drafts') IS NOT NULL
     OR to_regclass('public.pf_campaign_products') IS NOT NULL THEN
    RAISE EXCEPTION 'Campaign tables already exist; inspect schema and migrate explicitly';
  END IF;
END;
$$;

-- The catalog's id is globally unique, but a composite unique index is needed
-- for the FK that proves product and campaign belong to the same account.
CREATE UNIQUE INDEX IF NOT EXISTS pf_catalog_items_owner_id_uq
  ON public.pf_catalog_items (user_id, id);

CREATE TABLE IF NOT EXISTS public.pf_campaign_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 80 AND title = btrim(title)),
  channel text NOT NULL CHECK (channel IN ('instagram', 'facebook', 'whatsapp')),
  status text NOT NULL DEFAULT 'draft' CHECK (status = 'draft'),
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pf_campaign_window_ck CHECK (
    (starts_at IS NULL AND ends_at IS NULL) OR
    (starts_at IS NOT NULL AND ends_at IS NOT NULL AND starts_at < ends_at)
  ),
  CONSTRAINT pf_campaign_owner_id_uq UNIQUE (user_id, id)
);

CREATE TABLE IF NOT EXISTS public.pf_campaign_products (
  user_id uuid NOT NULL,
  campaign_id uuid NOT NULL,
  product_id uuid NOT NULL,
  position smallint NOT NULL CHECK (position BETWEEN 1 AND 50),
  PRIMARY KEY (user_id, campaign_id, product_id),
  CONSTRAINT pf_campaign_product_position_uq UNIQUE (user_id, campaign_id, position),
  CONSTRAINT pf_campaign_product_campaign_fk FOREIGN KEY (user_id, campaign_id)
    REFERENCES public.pf_campaign_drafts (user_id, id) ON DELETE CASCADE,
  CONSTRAINT pf_campaign_product_catalog_fk FOREIGN KEY (user_id, product_id)
    REFERENCES public.pf_catalog_items (user_id, id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS pf_campaign_drafts_owner_created_idx
  ON public.pf_campaign_drafts (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS pf_campaign_products_owner_product_idx
  ON public.pf_campaign_products (user_id, product_id);

-- Fail closed: there are deliberately NO authenticated policies or grants.
-- A future server-side entitlement design must be reviewed and tested before
-- introducing any API permissions; this schema alone does not enable Pro.
ALTER TABLE public.pf_campaign_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pf_campaign_drafts FORCE ROW LEVEL SECURITY;
ALTER TABLE public.pf_campaign_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pf_campaign_products FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.pf_campaign_drafts FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.pf_campaign_products FROM PUBLIC, anon, authenticated;
COMMIT;
