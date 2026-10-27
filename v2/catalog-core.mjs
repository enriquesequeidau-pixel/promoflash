/** PromoFlash cloud catalog — text-only product drafts. No photos or credentials. */
export const CATALOG_CATEGORIES = Object.freeze(['beauty', 'fashion', 'jewelry', 'food', 'home']);
export const CATALOG_PROMOTIONS = Object.freeze(['sale', 'new', 'pack', 'limited']);
const LIMITS = Object.freeze({
  name: 46, price: 18, old_price: 18, brand: 28, discount: 15,
  headline: 42, subtitle: 70, cta: 29
});
const FIELDS = Object.freeze({
  name: 'productName', price: 'price', old_price: 'oldPrice',
  brand: 'brand', discount: 'discount', headline: 'headline',
  subtitle: 'subtitle', cta: 'cta'
});
const FORBIDDEN = /[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/u;

export function normalizeCatalogDraft(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new TypeError('CATALOG_INVALID');
  }
  const result = {};
  for (const [field, max] of Object.entries(LIMITS)) {
    const raw = input[field];
    if (typeof raw !== 'string' || FORBIDDEN.test(raw) || raw.length > max) {
      throw new TypeError('CATALOG_INVALID_' + field.toUpperCase());
    }
    result[field] = raw.trim();
  }
  if (!result.name || !result.brand || !result.price) {
    throw new TypeError('CATALOG_REQUIRED_FIELDS');
  }
  if (!CATALOG_CATEGORIES.includes(input.category) ||
      !CATALOG_PROMOTIONS.includes(input.promo_type) ||
      typeof input.contain_photo !== 'boolean') {
    throw new TypeError('CATALOG_INVALID_OPTIONS');
  }
  return Object.freeze({ ...result, category: input.category,
    promo_type: input.promo_type, contain_photo: input.contain_photo });
}

export function readCatalogDraft(doc) {
  const draft = {};
  for (const [field, id] of Object.entries(FIELDS)) {
    const el = doc.getElementById(id);
    if (!el || typeof el.value !== 'string') throw new TypeError('CATALOG_EDITOR_UNAVAILABLE');
    draft[field] = el.value;
  }
  draft.category = doc.querySelector('.category.active')?.dataset.category;
  draft.promo_type = doc.getElementById('promoType')?.value;
  draft.contain_photo = doc.getElementById('containPhoto')?.checked;
  return normalizeCatalogDraft(draft);
}

export function applyCatalogDraft(doc, draft, clearPhoto) {
  const item = normalizeCatalogDraft(draft);
  const category = [...doc.querySelectorAll('.category')].find(b => b.dataset.category === item.category);
  const fields = Object.entries(FIELDS).map(([field, id]) => [doc.getElementById(id), item[field]]);
  const promo = doc.getElementById('promoType');
  const contain = doc.getElementById('containPhoto');
  if (!category || !promo || !contain || fields.some(([el]) => !el) ||
      typeof clearPhoto !== 'function') throw new TypeError('CATALOG_EDITOR_UNAVAILABLE');
  // The catalog never stores photographs. A previously loaded photo must not
  // silently become the new product's photo when a saved draft is opened.
  clearPhoto();
  category.click();
  for (const [el, value] of fields) {
    el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }
  promo.value = item.promo_type;
  contain.checked = item.contain_photo;
  contain.dispatchEvent(new Event('input', { bubbles: true }));
  const advanced = doc.getElementById('advancedSettings');
  if (advanced) advanced.open = true;
}

/** Clear only an editor draft loaded/saved through the private cloud catalog.
 * The caller decides when the draft belongs to an account being signed out.
 */
export function clearCatalogDraft(doc, clearPhoto) {
  const fields = Object.values(FIELDS).map(id => doc.getElementById(id));
  const promo = doc.getElementById('promoType');
  const contain = doc.getElementById('containPhoto');
  const defaultCategory = [...doc.querySelectorAll('.category')]
    .find(button => button.dataset.category === 'beauty');
  if (fields.some(el => !el) || !promo || !contain || !defaultCategory ||
      typeof clearPhoto !== 'function') {
    throw new TypeError('CATALOG_EDITOR_UNAVAILABLE');
  }
  clearPhoto();
  defaultCategory.click();
  for (const el of fields) {
    el.value = '';
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }
  promo.value = 'sale';
  promo.dispatchEvent(new Event('input', { bubbles: true }));
  contain.checked = false;
  contain.dispatchEvent(new Event('input', { bubbles: true }));
}
