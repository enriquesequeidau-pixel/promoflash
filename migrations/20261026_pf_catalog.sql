-- PromoFlash: authenticated text-only cloud product catalog.
-- Review and apply in Supabase before deploying editor-catalog.mjs.
-- No photographs, billing entitlements or secrets are stored here.
BEGIN;
CREATE TABLE IF NOT EXISTS public.pf_catalog_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('beauty','fashion','jewelry','food','home')),
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 46),
  price text NOT NULL CHECK (char_length(btrim(price)) BETWEEN 1 AND 18),
  old_price text NOT NULL DEFAULT '' CHECK (char_length(old_price) <= 18),
  brand text NOT NULL CHECK (char_length(btrim(brand)) BETWEEN 1 AND 28),
  discount text NOT NULL DEFAULT '' CHECK (char_length(discount) <= 15),
  headline text NOT NULL DEFAULT '' CHECK (char_length(headline) <= 42),
  subtitle text NOT NULL DEFAULT '' CHECK (char_length(subtitle) <= 70),
  cta text NOT NULL DEFAULT '' CHECK (char_length(cta) <= 29),
  promo_type text NOT NULL DEFAULT 'sale' CHECK (promo_type IN ('sale','new','pack','limited')),
  contain_photo boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pf_catalog_items_owner_updated_idx
  ON public.pf_catalog_items (user_id, updated_at DESC);
ALTER TABLE public.pf_catalog_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pf_catalog_items FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.pf_catalog_items FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.pf_catalog_items TO authenticated;
DROP POLICY IF EXISTS pf_catalog_select_own ON public.pf_catalog_items;
DROP POLICY IF EXISTS pf_catalog_insert_own ON public.pf_catalog_items;
DROP POLICY IF EXISTS pf_catalog_update_own ON public.pf_catalog_items;
DROP POLICY IF EXISTS pf_catalog_delete_own ON public.pf_catalog_items;
CREATE POLICY pf_catalog_select_own ON public.pf_catalog_items FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);
CREATE POLICY pf_catalog_insert_own ON public.pf_catalog_items FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY pf_catalog_update_own ON public.pf_catalog_items FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY pf_catalog_delete_own ON public.pf_catalog_items FOR DELETE TO authenticated
  USING ((select auth.uid()) = user_id);
CREATE OR REPLACE FUNCTION public.pf_catalog_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS pf_catalog_touch_updated_at ON public.pf_catalog_items;
CREATE TRIGGER pf_catalog_touch_updated_at BEFORE UPDATE ON public.pf_catalog_items
  FOR EACH ROW EXECUTE FUNCTION public.pf_catalog_touch_updated_at();
REVOKE ALL ON FUNCTION public.pf_catalog_touch_updated_at() FROM PUBLIC, anon, authenticated;
COMMIT;
