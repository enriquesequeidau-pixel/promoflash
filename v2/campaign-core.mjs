/** PromoFlash campaign planning contract, offline only.
 * A normalized draft is never an authorization to schedule, publish or bill.
 */
export const CAMPAIGN_CHANNELS = Object.freeze(['instagram', 'facebook', 'whatsapp']);
export const CAMPAIGN_MAX_PRODUCTS = 50;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const CONTROL = /[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/u;
const KEYS = Object.freeze(['title', 'channel', 'productIds', 'startsAt', 'endsAt', 'status']);

function utc(value) {
  if (value === null) return null;
  if (typeof value !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)) {
    throw new TypeError('CAMPAIGN_INVALID_DATE');
  }
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new TypeError('CAMPAIGN_INVALID_DATE');
  const canonical = date.toISOString();
  if (value !== canonical && value !== canonical.replace('.000Z', 'Z')) {
    throw new TypeError('CAMPAIGN_INVALID_DATE');
  }
  return canonical;
}

function copyProductIds(ids) {
  // Reject sparse arrays, accessors, custom properties and array subclasses.
  // Array#some skips holes; a sparse list could otherwise pass validation and
  // produce undefined IDs in the normalized draft.
  if (!Array.isArray(ids) || Object.getPrototypeOf(ids) !== Array.prototype ||
      ids.length < 1 || ids.length > CAMPAIGN_MAX_PRODUCTS) {
    throw new TypeError('CAMPAIGN_INVALID_PRODUCTS');
  }
  const descriptors = Object.getOwnPropertyDescriptors(ids);
  const keys = Reflect.ownKeys(ids);
  if (keys.length !== ids.length + 1 || !('value' in descriptors.length)) {
    throw new TypeError('CAMPAIGN_INVALID_PRODUCTS');
  }
  const result = [];
  for (let i = 0; i < ids.length; i++) {
    const descriptor = descriptors[String(i)];
    if (!descriptor || !descriptor.enumerable || !('value' in descriptor) ||
        typeof descriptor.value !== 'string' || !UUID.test(descriptor.value)) {
      throw new TypeError('CAMPAIGN_INVALID_PRODUCTS');
    }
    result.push(descriptor.value);
  }
  if (new Set(result).size !== result.length) {
    throw new TypeError('CAMPAIGN_INVALID_PRODUCTS');
  }
  return result;
}

export function normalizeCampaignDraft(input) {
  // Only JSON-like own data properties are accepted. Inherited fields and
  // getters must not silently supply a draft or execute code during validation.
  if (!input || typeof input !== 'object' || Array.isArray(input) ||
      (Object.getPrototypeOf(input) !== Object.prototype && Object.getPrototypeOf(input) !== null)) {
    throw new TypeError('CAMPAIGN_INVALID_FIELDS');
  }
  const descriptors = Object.getOwnPropertyDescriptors(input);
  const ownKeys = Reflect.ownKeys(input);
  if (ownKeys.length !== KEYS.length || ownKeys.some(key =>
      !KEYS.includes(key) || !descriptors[key].enumerable || !('value' in descriptors[key]))) {
    throw new TypeError('CAMPAIGN_INVALID_FIELDS');
  }
  const fields = Object.fromEntries(KEYS.map(key => [key, descriptors[key].value]));
  if (typeof fields.title !== 'string' || CONTROL.test(fields.title) ||
      !fields.title.trim() || fields.title.length > 80) {
    throw new TypeError('CAMPAIGN_INVALID_TITLE');
  }
  if (!CAMPAIGN_CHANNELS.includes(fields.channel) || fields.status !== 'draft') {
    throw new TypeError('CAMPAIGN_DRAFT_ONLY');
  }
  const productIds = copyProductIds(fields.productIds);
  const startsAt = utc(fields.startsAt);
  const endsAt = utc(fields.endsAt);
  if ((startsAt === null) !== (endsAt === null) ||
      (startsAt !== null && startsAt >= endsAt)) {
    throw new TypeError('CAMPAIGN_INVALID_WINDOW');
  }
  return Object.freeze({
    title: fields.title.trim(), channel: fields.channel,
    productIds: Object.freeze(productIds),
    startsAt, endsAt, status: 'draft'
  });
}
