import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sql = readFileSync(
  new URL('../migrations/20261027_pf_campaign_drafts_stage_only.sql', import.meta.url),
  'utf8'
);
const clean = source => source.replace(/--[^\n]*/g, '');

function assertCatalogRlsPreflight(source) {
  const statements = clean(source);
  const firstDDL = statements.search(/\bCREATE\s+(?:UNIQUE\s+)?(?:INDEX|TABLE)\b/i);
  const guard = statements.indexOf('c.relrowsecurity AND c.relforcerowsecurity');
  assert.ok(guard >= 0 && guard < firstDDL, 'RLS guard must precede all DDL');
  const preflight = statements.slice(0, firstDDL);
  assert.match(preflight, /c\.relkind\s+IN\s*\('r',\s*'p'\)/i);
  assert.match(preflight, /n\.nspname\s*=\s*'public'/i);
  assert.match(preflight, /c\.relname\s*=\s*'pf_catalog_items'/i);
  assert.match(preflight, /RAISE EXCEPTION 'Catalog must be a table with RLS enabled and forced'/i);
}

test('campaign migration fails closed if catalog is not an RLS-protected table', () => {
  assertCatalogRlsPreflight(sql);
});

test('regression: missing FORCE RLS check is detected', () => {
  const damaged = sql.replace('c.relrowsecurity AND c.relforcerowsecurity', 'c.relrowsecurity');
  assert.notEqual(damaged, sql, 'mutation must remove the FORCE RLS check');
  assert.throws(() => assertCatalogRlsPreflight(damaged), /RLS guard/);
});
