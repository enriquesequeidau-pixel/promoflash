-- PromoFlash: tabla aislada para preinscripciones. Ejecutar en proyecto NUEVO, dedicado.
-- No abrir acceso de lectura/escritura pública a otros recursos.
CREATE TABLE IF NOT EXISTS public.pf_waitlist (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email TEXT NOT NULL,
  business TEXT NOT NULL DEFAULT '',
  consent BOOLEAN NOT NULL DEFAULT FALSE,
  source TEXT NOT NULL DEFAULT 'landing',
  utm_source TEXT NOT NULL DEFAULT '',
  utm_medium TEXT NOT NULL DEFAULT '',
  utm_campaign TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT pf_waitlist_email_check CHECK (
    length(email) BETWEEN 5 AND 254 AND position('@' in email) > 1
  ),
  CONSTRAINT pf_waitlist_consent_check CHECK (consent IS TRUE),
  CONSTRAINT pf_waitlist_business_check CHECK (length(business) <= 90),
  CONSTRAINT pf_waitlist_source_check CHECK (length(source) <= 30),
  CONSTRAINT pf_waitlist_utms_check CHECK (length(utm_source) <= 100 AND length(utm_medium) <= 100 AND length(utm_campaign) <= 100)
);
CREATE UNIQUE INDEX IF NOT EXISTS pf_waitlist_email_unique ON public.pf_waitlist(lower(email));
ALTER TABLE public.pf_waitlist ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.pf_waitlist FROM anon, authenticated;
GRANT INSERT ON public.pf_waitlist TO anon;
-- No SELECT, UPDATE ni DELETE para clientes anónimos.
DROP POLICY IF EXISTS "pf_waitlist_anon_insert" ON public.pf_waitlist;
CREATE POLICY "pf_waitlist_anon_insert" ON public.pf_waitlist FOR INSERT TO anon
WITH CHECK (consent IS TRUE AND length(email) BETWEEN 5 AND 254 AND position('@' in email) > 1 AND source = 'landing');
-- La tabla está expuesta para INSERT. Limitar bots con función server-side/Turnstile
-- antes de escalar campañas; no usar esta política como control antispam integral.
