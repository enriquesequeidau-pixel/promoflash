import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeCampaignDraft, CAMPAIGN_MAX_PRODUCTS } from '../v2/campaign-core.mjs';

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const valid = () => ({ title: '  Rebajas de otoño  ', channel: 'instagram',
  productIds: [A, B], startsAt: null, endsAt: null, status: 'draft' });

test('normaliza un borrador sin publicar ni mutar el origen', () => {
  const input = valid();
  const draft = normalizeCampaignDraft(input);
  assert.equal(draft.title, 'Rebajas de otoño');
  assert.equal(draft.status, 'draft');
  assert.ok(Object.isFrozen(draft) && Object.isFrozen(draft.productIds));
  input.productIds.push(A);
  assert.deepEqual(draft.productIds, [A, B]);
});

test('no acepta publicación, campos de pago, fotos ni secretos', () => {
  for (const patch of [{ status: 'published' }, { status: 'scheduled' },
    { channel: 'tiktok' }, { photo: 'data:image/png;base64,abc' },
    { checkoutUrl: 'https://example.org' }, { apiKey: 'secret' }]) {
    assert.throws(() => normalizeCampaignDraft({ ...valid(), ...patch }), /CAMPAIGN_/);
  }
});

test('valida nombres y evita caracteres de control o direccionalidad', () => {
  for (const title of ['', '   ', 'x'.repeat(81), 'A\nB', 'A\u202eB', 123]) {
    assert.throws(() => normalizeCampaignDraft({ ...valid(), title }), /CAMPAIGN_INVALID_TITLE/);
  }
});

test('exige referencias únicas de catálogo y limita el tamaño', () => {
  for (const productIds of [[], [A, A], [A, 'not-a-uuid'], [null],
    Array.from({ length: CAMPAIGN_MAX_PRODUCTS + 1 }, (_, i) =>
      String(i).padStart(8, '0') + '-1111-4111-8111-111111111111')]) {
    assert.throws(() => normalizeCampaignDraft({ ...valid(), productIds }), /CAMPAIGN_INVALID_PRODUCTS/);
  }
});

test('fechas UTC son solo metadatos de planificación y deben ser válidas', () => {
  const draft = normalizeCampaignDraft({ ...valid(),
    startsAt: '2026-11-01T12:00:00Z', endsAt: '2026-11-03T12:00:00.000Z' });
  assert.equal(draft.startsAt, '2026-11-01T12:00:00.000Z');
  for (const patch of [
    { startsAt: '2026-11-01T12:00:00Z' },
    { endsAt: '2026-11-01T12:00:00Z' },
    { startsAt: '2026-11-03T12:00:00Z', endsAt: '2026-11-01T12:00:00Z' },
    { startsAt: '2026-02-30T12:00:00Z', endsAt: '2026-03-02T12:00:00Z' },
    { startsAt: '2026-11-01T09:00:00-03:00', endsAt: '2026-11-02T12:00:00Z' }
  ]) assert.throws(() => normalizeCampaignDraft({ ...valid(), ...patch }), /CAMPAIGN_INVALID_/);
});

test('rechaza estructuras no válidas', () => {
  for (const value of [null, [], 'campaign', 42]) {
    assert.throws(() => normalizeCampaignDraft(value), /CAMPAIGN_INVALID_FIELDS/);
  }
});

test('rechaza campos heredados y acepta JSON sin prototipo', () => {
  const inherited = Object.create(valid());
  assert.throws(() => normalizeCampaignDraft(inherited), /CAMPAIGN_INVALID_FIELDS/);
  const nullProto = Object.assign(Object.create(null), valid());
  assert.equal(normalizeCampaignDraft(nullProto).status, 'draft');
});

test('rechaza accesores, símbolos y campos no enumerables sin invocar getters', () => {
  let called = false;
  const withGetter = valid();
  Object.defineProperty(withGetter, 'title', { enumerable: true, get() { called = true; throw Error('getter called'); } });
  assert.throws(() => normalizeCampaignDraft(withGetter), /CAMPAIGN_INVALID_FIELDS/);
  assert.equal(called, false);
  const withSymbol = valid();
  withSymbol[Symbol('hidden')] = 'secret';
  assert.throws(() => normalizeCampaignDraft(withSymbol), /CAMPAIGN_INVALID_FIELDS/);
  const hidden = valid();
  Object.defineProperty(hidden, 'extra', { enumerable: false, value: 'secret' });
  assert.throws(() => normalizeCampaignDraft(hidden), /CAMPAIGN_INVALID_FIELDS/);
});
