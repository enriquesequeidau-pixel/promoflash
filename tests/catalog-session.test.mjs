import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Exercise the real browser module with a minimal DOM/Supabase stand-in.
// The CDN import is never reached: the harness starts without account config.
const source = readFileSync(new URL('../editor-catalog.mjs', import.meta.url), 'utf8')
  .replace(/^import .*;\s*$/gm, '');

function harness() {
  const ids = ['pfCatalogStatus', 'pfCatalogControls', 'pfCatalogList',
    'pfCatalogSave', 'pfCatalogNew'];
  const nodes = Object.fromEntries(ids.map(id => [id, {
    textContent: '', hidden: false, disabled: false, rows: [],
    replaceChildren() { this.rows = []; },
    append(row) { this.rows.push(row); },
    addEventListener() {}
  }]));
  const doc = {
    getElementById: id => nodes[id],
    createElement: tag => ({
      tag, textContent: '', children: [],
      addEventListener() {}, setAttribute() {},
      append(...children) { this.children.push(...children); }
    })
  };
  const factory = new Function('document', 'window', 'tabScopedAuthStorage',
    'readCatalogDraft', 'applyCatalogDraft', 'normalizeCatalogDraft', 'confirm',
    source + '\nreturn { verify, refresh, select: id => { currentId = id; }, ' +
      'state: () => ({ currentId, userId }), saveItem, setClient: value => { client = value; } };');
  const app = factory(doc, { PROMOFLASH_CONFIG: {} },
    () => {}, () => {}, () => {}, value => value, () => true);
  return { app, nodes };
}

test('token refresh preserves selected product; account switch clears selection', async () => {
  const { app, nodes } = harness();
  let account = 'user-a';
  app.setClient({
    auth: { getUser: async () => ({ data: { user: { id: account } }, error: null }) },
    from: () => ({
      select() { return this; }, eq() { return this; }, order() { return this; },
      limit: async () => ({ data: [], error: null })
    })
  });
  await app.verify();
  app.select('product-a');
  await app.verify();
  assert.equal(app.state().currentId, 'product-a');
  account = 'user-b';
  await app.verify();
  assert.equal(app.state().currentId, null);
  assert.equal(nodes.pfCatalogSave.textContent, 'Guardar producto');
});

test('older network response cannot replace newer catalog contents', async () => {
  const { app, nodes } = harness();
  let deferred = false;
  const pending = [];
  app.setClient({
    auth: { getUser: async () => ({ data: { user: { id: 'user-a' } }, error: null }) },
    from: () => ({
      select() { return this; }, eq() { return this; }, order() { return this; },
      limit() {
        if (!deferred) return Promise.resolve({ data: [], error: null });
        return new Promise(resolve => pending.push(resolve));
      }
    })
  });
  await app.verify();
  deferred = true;
  const older = app.refresh();
  const newer = app.refresh();
  for (let i = 0; i < 10 && pending.length < 2; i++) await Promise.resolve();
  assert.equal(pending.length, 2);
  const product = name => ({ id: 'item-1', name, brand: 'Brand', price: '1' });
  pending[1]({ data: [product('Newer')], error: null });
  await newer;
  pending[0]({ data: [product('Older')], error: null });
  await older;
  assert.match(nodes.pfCatalogList.rows[0].children[0].textContent, /Newer/);
  assert.doesNotMatch(nodes.pfCatalogList.rows[0].children[0].textContent, /Older/);
});


async function saveDuringAuthRefresh(switchAccount) {
  const { app, nodes } = harness();
  let account = 'user-a';
  let settle;
  app.setClient({
    auth: { getUser: async () => ({ data: { user: { id: account } }, error: null }) },
    from: () => ({
      select() { return this; }, eq() { return this; }, order() { return this; },
      limit: async () => ({ data: [], error: null }),
      insert() { return this; },
      single() { return new Promise(resolve => { settle = resolve; }); }
    })
  });
  await app.verify();
  const saving = app.saveItem();
  for (let i = 0; i < 20 && !settle; i++) await Promise.resolve();
  assert.equal(typeof settle, 'function', 'save must be pending');
  if (switchAccount) account = 'user-b';
  await app.verify();
  settle({ data: { id: 'saved-item' }, error: null });
  await saving;
  return { app, nodes };
}

test('save response survives same-user auth token refresh without duplicate insert', async () => {
  const { app, nodes } = await saveDuringAuthRefresh(false);
  assert.equal(app.state().currentId, 'saved-item');
  assert.equal(nodes.pfCatalogSave.textContent, 'Actualizar producto');
});

test('save response cannot select an old account product after account switch', async () => {
  const { app, nodes } = await saveDuringAuthRefresh(true);
  assert.equal(app.state().userId, 'user-b');
  assert.equal(app.state().currentId, null);
  assert.equal(nodes.pfCatalogSave.textContent, 'Guardar producto');
});


test('revoked session clears rendered private products during catalog refresh', async () => {
  const { app, nodes } = harness();
  let authenticatedUser = { id: 'user-a' };
  app.setClient({
    auth: { getUser: async () => ({ data: { user: authenticatedUser }, error: null }) },
    from: () => ({
      select() { return this; }, eq() { return this; }, order() { return this; },
      limit: async () => ({
        data: [{ id: 'item-a', name: 'Private', brand: 'Brand', price: '1' }],
        error: null
      })
    })
  });
  await app.verify();
  assert.equal(nodes.pfCatalogList.rows.length, 1);
  authenticatedUser = null; // server-side session revocation without auth callback
  await app.refresh();
  assert.equal(nodes.pfCatalogList.rows.length, 0);
  assert.equal(nodes.pfCatalogControls.hidden, true);
  assert.equal(app.state().userId, null);
  assert.match(nodes.pfCatalogStatus.textContent, /sesión terminó/);
});

test('revoked session blocks save and hides previously loaded private products', async () => {
  const { app, nodes } = harness();
  let authenticatedUser = { id: 'user-a' };
  let mutations = 0;
  app.setClient({
    auth: { getUser: async () => ({ data: { user: authenticatedUser }, error: null }) },
    from: () => ({
      select() { return this; }, eq() { return this; }, order() { return this; },
      limit: async () => ({
        data: [{ id: 'item-a', name: 'Private', brand: 'Brand', price: '1' }],
        error: null
      }),
      insert() { mutations++; return this; }, update() { mutations++; return this; }
    })
  });
  await app.verify();
  assert.equal(nodes.pfCatalogList.rows.length, 1);
  authenticatedUser = null;
  await app.saveItem();
  assert.equal(mutations, 0);
  assert.equal(nodes.pfCatalogList.rows.length, 0);
  assert.equal(nodes.pfCatalogControls.hidden, true);
  assert.equal(app.state().userId, null);
});
