import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sql = readFileSync(new URL('../migrations/20261027_pf_campaign_drafts_stage_only.sql', import.meta.url), 'utf8');
const statements = sql.replace(/--[^\n]*/g, '');

test('la migración es transaccional y depende del catálogo', () => {
  assert.match(statements, /^\s*BEGIN\s*;/i);
  assert.match(statements, /to_regclass\('public\.pf_catalog_items'\) IS NULL/i);
  assert.match(statements, /RAISE EXCEPTION/i);
  assert.match(statements, /CREATE UNIQUE INDEX IF NOT EXISTS pf_catalog_items_owner_id_uq\s+ON public\.pf_catalog_items\s*\(user_id, id\)/i);
  assert.match(statements, /COMMIT\s*;\s*$/i);
});

test('rechaza tablas preexistentes antes de cualquier DDL (sin reutilizar esquema inseguro)', () => {
  const catalog = statements.indexOf("to_regclass('public.pf_catalog_items')");
  const drafts = statements.indexOf("to_regclass('public.pf_campaign_drafts')");
  const products = statements.indexOf("to_regclass('public.pf_campaign_products')");
  const firstDDL = statements.search(/\\bCREATE\\s+(?:UNIQUE\\s+)?(?:INDEX|TABLE)\\b/i);
  assert.ok(catalog >= 0 && drafts > catalog && products > drafts);
  assert.ok(firstDDL > products, 'la inspección debe preceder todo CREATE');
  assert.match(statements.slice(drafts, firstDDL),
    /RAISE EXCEPTION 'Campaign tables already exist; inspect schema and migrate explicitly'/i);
});

test('el vínculo a productos exige mismo propietario en ambas claves compuestas', () => {
  assert.match(statements, /UNIQUE\s*\(user_id, id\)/i);
  assert.match(statements, /FOREIGN KEY\s*\(user_id, campaign_id\)\s*REFERENCES public\.pf_campaign_drafts\s*\(user_id, id\)/i);
  assert.match(statements, /FOREIGN KEY\s*\(user_id, product_id\)\s*REFERENCES public\.pf_catalog_items\s*\(user_id, id\)/i);
  assert.match(statements, /PRIMARY KEY\s*\(user_id, campaign_id, product_id\)/i);
});

test('solo permite borradores y máximo 50 referencias distintas por posición', () => {
  assert.match(statements, /CHECK\s*\(status = 'draft'\)/i);
  assert.match(statements, /CHECK\s*\(channel IN\s*\('instagram', 'facebook', 'whatsapp'\)\)/i);
  assert.match(statements, /CHECK\s*\(position BETWEEN 1 AND 50\)/i);
  assert.match(statements, /UNIQUE\s*\(user_id, campaign_id, position\)/i);
  assert.match(statements, /starts_at < ends_at/i);
});

test('RLS forzado sin políticas ni permisos de cliente', () => {
  for (const table of ['pf_campaign_drafts', 'pf_campaign_products']) {
    assert.match(statements, new RegExp('ALTER TABLE public\\.' + table + ' ENABLE ROW LEVEL SECURITY', 'i'));
    assert.match(statements, new RegExp('ALTER TABLE public\\.' + table + ' FORCE ROW LEVEL SECURITY', 'i'));
    assert.match(statements, new RegExp('REVOKE ALL ON TABLE public\\.' + table + ' FROM PUBLIC, anon, authenticated', 'i'));
  }
  assert.doesNotMatch(statements, /\bCREATE\s+POLICY\b|\bGRANT\s+/i);
});
