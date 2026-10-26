import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalizeCatalogDraft, applyCatalogDraft } from '../v2/catalog-core.mjs';
const valid = Object.freeze({ category: 'beauty', name: 'Serum', price: '$299 MXN',
  old_price: '', brand: 'Tienda', discount: '-20%', headline: 'Promoción',
  subtitle: 'Hoy', cta: 'Pide ahora', promo_type: 'sale', contain_photo: false });
test('acepta un borrador válido sin mutar datos ni permitir foto', () => {
  const result = normalizeCatalogDraft(valid);
  assert.equal(result.name, 'Serum');
  assert.ok(Object.isFrozen(result));
  assert.equal(Object.hasOwn(result, 'photo'), false);
});
test('rechaza campos incompletos, exceso de longitud y controles Unicode', () => {
  for (const changes of [
    { name: '' }, { price: '' }, { brand: '' }, { name: 'x'.repeat(47) },
    { category: 'unknown' }, { promo_type: '__proto__' },
    { contain_photo: 'false' }, { headline: 'abc\u202Eevil' }, { cta: 'ok\nnext' }
  ]) assert.throws(() => normalizeCatalogDraft({ ...valid, ...changes }), /CATALOG_/);
});
test('abrir un producto borra la foto previa antes de cambiar categoría y campos', () => {
  const calls = [];
  const els = Object.fromEntries([
    'productName','price','oldPrice','brand','discount','headline','subtitle','cta',
    'promoType','containPhoto','advancedSettings'
  ].map(id => [id, { value: '', checked: false, dispatchEvent: () => calls.push('input:' + id) }]));
  const category = { dataset: { category: 'beauty' }, click: () => calls.push('category') };
  const doc = { getElementById: id => els[id], querySelectorAll: () => [category] };
  const originalEvent = globalThis.Event;
  globalThis.Event = class { constructor(type) { this.type = type; } };
  try { applyCatalogDraft(doc, valid, () => calls.push('clearPhoto')); }
  finally { globalThis.Event = originalEvent; }
  assert.deepEqual(calls.slice(0, 2), ['clearPhoto', 'category']);
  assert.equal(els.productName.value, 'Serum');
  assert.equal(els.containPhoto.checked, false);
  assert.equal(els.advancedSettings.open, true);
});
test('SQL protege filas por usuario y nunca guarda fotos ni habilita pagos', () => {
  const sql = readFileSync(new URL('../migrations/20261026_pf_catalog.sql', import.meta.url), 'utf8');
  const ui = readFileSync(new URL('../editor-catalog.mjs', import.meta.url), 'utf8');
  assert.match(sql, /ENABLE ROW LEVEL SECURITY/);
  assert.match(sql, /FORCE ROW LEVEL SECURITY/);
  assert.equal((sql.match(/\(select auth\.uid\(\)\) = user_id/g) || []).length, 5);
  assert.match(sql, /REVOKE ALL ON TABLE public\.pf_catalog_items FROM PUBLIC, anon/);
  assert.doesNotMatch(sql, /photo_url|image_blob|service_role|checkout_enabled/i);
  assert.match(ui, /existingSession\(\)/);
  assert.match(ui, /tabScopedAuthStorage\(AUTH_KEY\)/);
  assert.match(ui, /\.eq\('user_id', user\.id\)/);
  assert.doesNotMatch(ui, /localStorage\.setItem|photo\.arrayBuffer|upload\(/);
});
