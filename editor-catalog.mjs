/** Cloud catalog for signed-in PromoFlash users; requires SQL migration first.
 * No anonymous SDK download, paid entitlement changes, or photo uploads.
 */
import { tabScopedAuthStorage } from './auth-storage.mjs';
import { readCatalogDraft, applyCatalogDraft, normalizeCatalogDraft } from './v2/catalog-core.mjs';
const $ = id => document.getElementById(id);
const cfg = window.PROMOFLASH_CONFIG || {};
const source = cfg.accountSupabaseUrl || cfg.supabaseUrl;
const publishable = cfg.accountSupabaseAnonKey || cfg.supabaseAnonKey;
const AUTH_KEY = 'sequeidaulabs-promoflash-auth-v1';
const COLUMNS = 'id,category,name,price,old_price,brand,discount,headline,subtitle,cta,contain_photo,promo_type,updated_at';
const status = $('pfCatalogStatus');
const controls = $('pfCatalogControls');
const list = $('pfCatalogList');
const saveButton = $('pfCatalogSave');
const newButton = $('pfCatalogNew');
let client = null, userId = null, currentId = null, epoch = 0, refreshSerial = 0, accountEpoch = 0, busy = false;
function tell(message) { status.textContent = message; }
function clear() {
  ++accountEpoch;
  ++epoch;
  ++refreshSerial;
  userId = null;
  currentId = null;
  controls.hidden = true;
  list.replaceChildren();
  saveButton.textContent = 'Guardar producto';
}
function existingSession() {
  try { return Boolean(sessionStorage.getItem(AUTH_KEY) || localStorage.getItem(AUTH_KEY)); }
  catch { return false; }
}
async function authenticated() {
  if (!client) throw new Error('AUTH_REQUIRED');
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user || user.id !== userId) throw new Error('AUTH_REQUIRED');
  return user;
}
function isAuthFailure(error) {
  // Supabase/PostgREST can reject an expired JWT after getUser() succeeds.
  // Treat HTTP 401 (not generic 403/RLS denials) as session revocation.
  return error?.message === 'AUTH_REQUIRED' || Number(error?.status) === 401 || error?.code === 'PGRST301';
}
function render(items) {
  list.replaceChildren();
  if (!items.length) { tell('Catálogo vacío. Guarda tu primer producto.'); return; }
  for (const item of items) {
    const row = document.createElement('div');
    row.className = 'pf-catalog-row';
    const title = document.createElement('span');
    title.textContent = item.name + ' · ' + item.price + ' · ' + item.brand;
    const open = document.createElement('button');
    open.type = 'button'; open.textContent = 'Abrir';
    open.addEventListener('click', () => {
      if (!userId || busy) return;
      try {
        applyCatalogDraft(document, item, window.PromoFlashDemo?.clearPhoto);
        currentId = item.id;
        saveButton.textContent = 'Actualizar producto';
        tell('Producto cargado. Agrega su foto nuevamente si corresponde.');
      } catch { tell('No se pudo abrir el producto.'); }
    });
    const remove = document.createElement('button');
    remove.type = 'button'; remove.textContent = 'Eliminar';
    remove.setAttribute('aria-label', 'Eliminar ' + item.name);
    remove.addEventListener('click', () => void removeItem(item.id));
    row.append(title, open, remove);
    list.append(row);
  }
}
async function refresh() {
  if (!client) return;
  const version = epoch;
  const request = ++refreshSerial;
  try {
    const user = await authenticated();
    const { data, error } = await client.from('pf_catalog_items')
      .select(COLUMNS).eq('user_id', user.id)
      .order('updated_at', { ascending: false }).limit(100);
    if (version !== epoch || request !== refreshSerial || user.id !== userId) return;
    if (error) throw error;
    render((data || []).map(item => ({ ...normalizeCatalogDraft(item), id: item.id })));
  } catch (error) {
    if (version !== epoch || request !== refreshSerial) return;
    if (isAuthFailure(error)) {
      // A revoked session must not leave another account's private rows visible.
      clear();
      tell('Tu sesión terminó. Inicia sesión nuevamente para ver tu catálogo.');
    } else {
      tell('No se pudo cargar el catálogo. Revisa tu conexión o la configuración.');
    }
  }
}
async function verify() {
  // Hide old account rows immediately, but preserve the selected draft on
  // same-user token refresh so "Actualizar" cannot silently become "Crear".
  const version = ++epoch;
  ++refreshSerial;
  controls.hidden = true;
  list.replaceChildren();
  if (!client) { clear(); return; }
  try {
    const { data: { user }, error } = await client.auth.getUser();
    if (version !== epoch) return;
    if (error || !user) {
      clear();
      tell('Inicia sesión en Mi cuenta para guardar productos en la nube.');
      return;
    }
    if (user.id !== userId) {
      ++accountEpoch;
      currentId = null;
      saveButton.textContent = 'Guardar producto';
    }
    userId = user.id;
    controls.hidden = false;
    tell('Cargando catálogo privado…');
    await refresh();
  } catch {
    if (version === epoch) {
      clear();
      tell('No se pudo verificar la sesión.');
    }
  }
}
async function run(operation) {
  if (busy || !userId) return;
  busy = true;
  saveButton.disabled = true;
  newButton.disabled = true;
  const version = accountEpoch;
  try {
    const user = await authenticated();
    await operation(user, version);
    // A token refresh may have reverified the same user during the write.
    // Refresh that user's catalog even if the earlier request epoch changed.
    if (version !== accountEpoch || userId !== user.id) return;
    await refresh();
  } catch (error) {
    if (version === accountEpoch) {
      if (isAuthFailure(error)) {
        // Fail closed if a write is attempted after server-side revocation.
        clear();
        tell('Tu sesión terminó. Inicia sesión nuevamente para guardar cambios.');
      } else {
        tell('No se pudo guardar el cambio. Verifica tu conexión y vuelve a intentar.');
      }
    }
  } finally {
    busy = false;
    saveButton.disabled = false;
    newButton.disabled = false;
  }
}
async function saveItem() {
  await run(async (user, version) => {
    const draft = readCatalogDraft(document);
    let query;
    if (currentId) {
      query = client.from('pf_catalog_items').update(draft)
        .eq('id', currentId).eq('user_id', user.id);
    } else {
      query = client.from('pf_catalog_items').insert({ ...draft, user_id: user.id });
    }
    const { data, error } = await query.select('id').single();
    if (error || !data?.id) throw error || new Error('CATALOG_SAVE_FAILED');
    if (version !== accountEpoch || userId !== user.id) return;
    currentId = data.id;
    saveButton.textContent = 'Actualizar producto';
    tell('Producto guardado en tu catálogo privado. Las fotos no se guardan.');
  });
}
async function removeItem(id) {
  if (!confirm('¿Eliminar este producto guardado? Esta acción no se puede deshacer.')) return;
  await run(async (user, version) => {
    const { error } = await client.from('pf_catalog_items').delete()
      .eq('id', id).eq('user_id', user.id);
    if (error) throw error;
    if (version !== accountEpoch || userId !== user.id) return;
    if (currentId === id) { currentId = null; saveButton.textContent = 'Guardar producto'; }
    tell('Producto eliminado del catálogo.');
  });
}
function startNew() {
  currentId = null;
  saveButton.textContent = 'Guardar producto';
  tell('Se guardará como producto nuevo. La foto actual permanece solo en este dispositivo.');
}
async function start() {
  if (!source || !publishable || !existingSession()) {
    tell('Inicia sesión en Mi cuenta para guardar productos en la nube. El editor gratis sigue disponible.');
    return;
  }
  try {
    const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.0/+esm');
    client = createClient(source, publishable, { auth: {
      persistSession: true, autoRefreshToken: true, detectSessionInUrl: false,
      storage: tabScopedAuthStorage(AUTH_KEY), storageKey: AUTH_KEY
    }});
    client.auth.onAuthStateChange(() => { queueMicrotask(() => void verify()); });
    await verify();
  } catch { tell('El catálogo no está disponible ahora. Puedes seguir diseñando gratis.'); }
}
saveButton?.addEventListener('click', () => void saveItem());
newButton?.addEventListener('click', startNew);
void start();
