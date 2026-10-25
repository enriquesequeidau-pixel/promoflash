import test from 'node:test';
import assert from 'node:assert/strict';
import {createCatalogSandbox} from '../v2/catalog-sandbox.mjs';

const A='11111111-1111-4111-8111-111111111111';
const B='22222222-2222-4222-8222-222222222222';
const C='33333333-3333-4333-8333-333333333333';
const PHOTO='44444444-4444-4444-8444-444444444444';
const base={brandId:A,name:'Producto',category:'food',priceCentavos:19900};
function setup(){
  let seq=0;
  const identities={
    pro:{uid:'owner-a',plan:'pro'},
    business:{uid:'owner-a',plan:'business'},
    free:{uid:'owner-a',plan:'free'},
    other:{uid:'owner-b',plan:'pro'}
  };
  const service=createCatalogSandbox({
    authenticate:async token=>identities[token]||null,
    ownsBrand:async(uid,id)=>uid==='owner-a'?[A,C].includes(id):id===B,
    ownsPhoto:async(uid,id)=>uid==='owner-a'&&id===PHOTO,
    makeId:()=>String(++seq)
  });
  return service;
}
async function denied(promise,status,code){
  await assert.rejects(promise,error=>error.status===status&&error.code===code);
}
test('anonymous and unknown plans fail closed',async()=>{
  const s=setup();
  await denied(s.list('invalid'),401,'UNAUTHENTICATED');
  await denied(s.create('invalid',base),401,'UNAUTHENTICATED');
});
test('Free cannot mutate; existing products survive downgrade and remain readable',async()=>{
  const s=setup();
  const saved=await s.create('pro',base);
  assert.equal((await s.list('free')).length,1);
  await denied(s.create('free',base),403,'PLAN_REQUIRED');
  await denied(s.update('free',saved.id,base),403,'PLAN_REQUIRED');
  await denied(s.remove('free',saved.id),403,'PLAN_REQUIRED');
  assert.equal((await s.list('free'))[0].id,saved.id);
});
test('cross-account list and writes never disclose or alter another account product',async()=>{
  const s=setup();
  const saved=await s.create('pro',base);
  assert.deepEqual(await s.list('other'),[]);
  await denied(s.update('other',saved.id,{...base,brandId:B}),404,'PRODUCT_NOT_FOUND');
  await denied(s.remove('other',saved.id),404,'PRODUCT_NOT_FOUND');
  assert.equal((await s.list('pro')).length,1);
  assert.equal('ownerUid' in saved,false);
});
test('brand and private photo ownership must be checked by trusted adapter',async()=>{
  const s=setup();
  await denied(s.create('pro',{...base,brandId:B}),404,'BRAND_NOT_FOUND');
  await denied(s.create('pro',{...base,photoAssetId:B}),404,'PHOTO_NOT_FOUND');
  const p=await s.create('pro',{...base,photoAssetId:PHOTO});
  assert.equal(p.photoAssetId,PHOTO);
  await denied(s.update('pro',p.id,{...base,brandId:B}),404,'BRAND_NOT_FOUND');
});
test('malformed product and browser-injected privilege fields are rejected',async()=>{
  const s=setup();
  await denied(s.create('pro',{...base,plan:'business'}),422,'INVALID_PRODUCT');
  await denied(s.create('pro',{...base,owner_uid:'owner-b'}),422,'INVALID_PRODUCT');
  await denied(s.create('pro',{...base,priceCentavos:1.5}),422,'INVALID_PRODUCT');
  assert.deepEqual(await s.list('pro'),[]);
});
test('Pro 50-product quota survives 51 simultaneous creates in one sandbox process',async()=>{
  const s=setup();
  const outcomes=await Promise.allSettled(Array.from({length:51},()=>s.create('pro',base)));
  assert.equal(outcomes.filter(x=>x.status==='fulfilled').length,50);
  assert.equal(outcomes.filter(x=>x.status==='rejected'&&x.reason.status===409).length,1);
  assert.equal((await s.list('pro')).length,50);
});
test('Business 250-product limit is aggregated across brands, not per brand',async()=>{
  const s=setup();
  const outcomes=await Promise.allSettled(Array.from({length:251},(_,i)=>
    s.create('business',{...base,brandId:i%2?A:C})));
  assert.equal(outcomes.filter(x=>x.status==='fulfilled').length,250);
  assert.equal(outcomes.filter(x=>x.status==='rejected'&&x.reason.code==='PRODUCT_QUOTA').length,1);
  assert.equal((await s.list('business')).length,250);
});
test('update preserves ID and record count; delete frees a quota slot',async()=>{
  const s=setup();
  const p=await s.create('pro',base);
  const updated=await s.update('pro',p.id,{...base,name:'Nuevo nombre'});
  assert.equal(updated.id,p.id);
  assert.equal(updated.name,'Nuevo nombre');
  assert.equal((await s.list('pro')).length,1);
  assert.equal(await s.remove('pro',p.id),true);
  await denied(s.remove('pro',p.id),404,'PRODUCT_NOT_FOUND');
  assert.equal((await s.list('pro')).length,0);
  assert.equal((await s.create('pro',base)).name,base.name);
});
test('sandbox construction fails closed without trusted dependencies',()=>{
  assert.throws(()=>createCatalogSandbox({}),TypeError);
});
