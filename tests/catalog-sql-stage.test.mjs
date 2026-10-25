import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const sql=readFileSync(new URL('../v2/sql/pf_v2_catalog_stage_only.sql',import.meta.url),'utf8');
const executable=sql.split('\n').filter(line=>!/^\s*--/.test(line)).join('\n');

test('staging migration is explicitly isolated and never auto-executed',()=>{
  assert.match(sql,/NOT APPLIED/);
  assert.match(sql,/isolated, backed-up test database/);
  assert.match(executable,/^\s*begin\s*;/i);
  assert.match(executable,/commit\s*;\s*$/i);
  assert.doesNotMatch(executable,/drop\s+(table|schema)|truncate\s+|delete\s+from\s+/i);
});
test('tables are prefixed per app and never modify other MicroApps tables',()=>{
  const created=[...executable.matchAll(/create\s+table\s+public\.([a-z_0-9]+)/gi)]
    .map(match=>match[1]);
  assert.deepEqual(created,['pf_v2_brands','pf_v2_products']);
  assert.doesNotMatch(executable,/\b(?:cotizaflow_|mystery_|pm_|pro_entitlements)\b/i);
});
test('both tables enable RLS and only owner-scoped SELECT policies',()=>{
  for(const name of ['pf_v2_brands','pf_v2_products']){
    assert.match(executable,new RegExp('alter\\s+table\\s+public\\.'+name+
      '\\s+enable\\s+row\\s+level\\s+security\\s*;','i'));
    assert.match(executable,new RegExp('create\\s+policy\\s+'+name+
      '_select_owner\\s+on\\s+public\\.'+name+
      '\\s+for\\s+select\\s+to\\s+authenticated\\s+using\\s*\\(owner_uid\\s*=\\s*\\(select\\s+auth\\.uid\\(\\)\\)\\)','i'));
  }
  assert.doesNotMatch(executable,/for\s+(?:insert|update|delete|all)\s+to\s+(?:authenticated|anon)/i);
});
test('browser writes are explicitly revoked before opt-in read grant',()=>{
  const revoke=executable.indexOf('revoke all on table');
  const granted=executable.indexOf('grant select on table');
  assert.ok(revoke>=0&&granted>revoke);
  assert.match(executable,/revoke all on table\s+public\.pf_v2_brands,\s*public\.pf_v2_products\s+from public, anon, authenticated\s*;/i);
  assert.match(executable,/grant select on table public\.pf_v2_brands, public\.pf_v2_products to authenticated;/);
  assert.doesNotMatch(executable,/grant\s+(?:all|insert|update|delete)[^;]*\b(?:authenticated|anon)\b/i);
  assert.match(executable,/grant select, insert, update, delete on table\s+public\.pf_v2_brands, public\.pf_v2_products to service_role;/);
});
test('cross-tenant brand links are enforced by composite owner foreign key',()=>{
  assert.match(executable,/unique\s*\(id, owner_uid\)/);
  assert.match(executable,/foreign\s+key\s*\(brand_id, owner_uid\)\s+references public\.pf_v2_brands\s*\(id, owner_uid\)/i);
  assert.match(executable,/owner_uid uuid not null references auth\.users\(id\)/);
});
test('server column constraints preserve MXN centavos and supported categories',()=>{
  assert.match(executable,/price_centavos integer not null check\s*\(price_centavos between 0 and 100000000\)/);
  assert.match(executable,/currency text not null default 'MXN' check\s*\(currency = 'MXN'\)/);
  assert.match(executable,/category text not null check\s*\(category in\s*\('beauty','fashion','jewelry','food','home'\)\)/);
});
