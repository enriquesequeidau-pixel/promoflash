import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeProductDraft,formatProductPriceMXN,PRODUCT_CATEGORIES,MAX_PRICE_CENTAVOS} from '../v2/product-contract.mjs';

const BRAND='11111111-1111-4111-8111-111111111111';
const PHOTO='22222222-2222-4222-8222-222222222222';
const base={brandId:BRAND,name:'Café de Ñandú',category:'food',priceCentavos:29900};

test('normalizes a Mexican product without accepting plan or owner from the browser',()=>{
  const p=normalizeProductDraft({...base,name:'  Café de Ñandú  ',description:'Tostado\nlocal',photoAssetId:PHOTO.toUpperCase()});
  assert.deepEqual(p,{brandId:BRAND,name:'Café de Ñandú',description:'Tostado\nlocal',category:'food',priceCentavos:29900,currency:'MXN',photoAssetId:PHOTO});
  assert.equal(Object.isFrozen(p),true);
  assert.equal('owner_uid' in p,false);
  assert.equal('plan' in p,false);
});
test('all five Free editor categories are supported for premium saved products',()=>{
  assert.deepEqual(PRODUCT_CATEGORIES,['beauty','fashion','jewelry','food','home']);
  for(const category of PRODUCT_CATEGORIES)assert.equal(normalizeProductDraft({...base,category}).category,category);
});
test('zero and exact integer centavos are allowed; floating point, negative and huge amounts fail',()=>{
  assert.equal(normalizeProductDraft({...base,priceCentavos:0}).priceCentavos,0);
  assert.equal(normalizeProductDraft({...base,priceCentavos:MAX_PRICE_CENTAVOS}).priceCentavos,MAX_PRICE_CENTAVOS);
  for(const priceCentavos of [-1,1.5,NaN,Infinity,MAX_PRICE_CENTAVOS+1,'29900',null,undefined])
    assert.throws(()=>normalizeProductDraft({...base,priceCentavos}),{code:'INVALID_PRODUCT'});
});
test('forged ownership, currency, entitlement, public photo URL and unknown fields are denied',()=>{
  for(const field of ['owner_uid','user_id','plan','currency','entitlement','photoUrl','status','__proto__'])
    assert.throws(()=>normalizeProductDraft(Object.assign(Object.create(null),base,{[field]:'forged'})),{code:'INVALID_PRODUCT'});
});
test('missing or malformed brand and photo identifiers fail closed',()=>{
  for(const brandId of [null,'','other-brand','../secret',PHOTO.slice(0,-1)])
    assert.throws(()=>normalizeProductDraft({...base,brandId}),{code:'INVALID_PRODUCT'});
  for(const photoAssetId of ['../image.png','https://public.example/photo',1])
    assert.throws(()=>normalizeProductDraft({...base,photoAssetId}),{code:'INVALID_PRODUCT'});
  assert.equal(normalizeProductDraft(base).photoAssetId,null);
});
test('malformed text, bidi controls, CR and invalid category are rejected',()=>{
  for(const draft of [{name:''},{name:'x'.repeat(81)},{name:'Bad\nName'},{name:'A\u202eB'},
    {description:'x'.repeat(501)},{description:'x\r\ny'},{category:'health'},
    {category:'<script>'},{name:4},{description:{toString(){throw Error('should not run')}}}])
    assert.throws(()=>normalizeProductDraft({...base,...draft}),{code:'INVALID_PRODUCT'});
});
test('rejects non-plain objects and accessor payloads without invoking getters',()=>{
  for(const input of [null,[],new Date(),Object.create({name:'X'})])
    assert.throws(()=>normalizeProductDraft(input),{code:'INVALID_PRODUCT'});
  let invoked=false;
  const input={...base};
  Object.defineProperty(input,'name',{enumerable:true,get(){invoked=true;return 'bad';}});
  assert.throws(()=>normalizeProductDraft(input),{code:'INVALID_PRODUCT'});
  assert.equal(invoked,false);
});
test('price presentation uses es-MX formatting without modifying integer amount',()=>{
  const p=normalizeProductDraft(base);
  assert.match(formatProductPriceMXN(p.priceCentavos),/299[.,]00/);
  assert.equal(p.priceCentavos,29900);
  for(const bad of [1.2,-1,'100'])assert.throws(()=>formatProductPriceMXN(bad),{code:'INVALID_PRODUCT'});
});
