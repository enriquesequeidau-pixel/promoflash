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

export function normalizeCampaignDraft(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input) ||
      Object.keys(input).some(key => !KEYS.includes(key))) {
    throw new TypeError('CAMPAIGN_INVALID_FIELDS');
  }
  if (typeof input.title !== 'string' || CONTROL.test(input.title) ||
      !input.title.trim() || input.title.length > 80) {
    throw new TypeError('CAMPAIGN_INVALID_TITLE');
  }
  if (!CAMPAIGN_CHANNELS.includes(input.channel) || input.status !== 'draft') {
    throw new TypeError('CAMPAIGN_DRAFT_ONLY');
  }
  if (!Array.isArray(input.productIds) || input.productIds.length < 1 ||
      input.productIds.length > CAMPAIGN_MAX_PRODUCTS ||
      input.productIds.some(id => typeof id !== 'string' || !UUID.test(id)) ||
      new Set(input.productIds).size !== input.productIds.length) {
    throw new TypeError('CAMPAIGN_INVALID_PRODUCTS');
  }
  const startsAt = utc(input.startsAt);
  const endsAt = utc(input.endsAt);
  if ((startsAt === null) !== (endsAt === null) ||
      (startsAt !== null && startsAt >= endsAt)) {
    throw new TypeError('CAMPAIGN_INVALID_WINDOW');
  }
  return Object.freeze({
    title: input.title.trim(), channel: input.channel,
    productIds: Object.freeze([...input.productIds]),
    startsAt, endsAt, status: 'draft'
  });
}
