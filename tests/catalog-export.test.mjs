import test from 'node:test';
import assert from 'node:assert/strict';
import {buildCatalogExport,attachCatalogExportButton} from '../v2/catalog-export.mjs';
const BRAND='11111111-1111-4111-8111-111111111111';
const PHOTO='22222222-2222-4222-8222-222222222222';
const item={id:'p1',brandId:BRAND,name:'Café',description:'Grano tostado',category:'food',priceCentavos:19900,currency:'MXN',photoAssetId:PHOTO};
const now=()=>new Date('2026-10-25T16:00:00Z');
const catalog={list:async request=>request==='owner'?[item]:[]};
test('exports own product metadata in stable MXN JSON without photo bytes',async()=>{
  const result=JSON.parse(await buildCatalogExport({catalog,request:'owner',now}));
  assert.equal(result.format,'promoflash-catalog-v2');
  assert.equal(result.exportedAt,'2026-10-25T16:00:00.000Z');
  assert.deepEqual(result.products,[item]);
  assert.equal(JSON.stringify(result).includes('ownerUid'),false);
});
test('downgraded Free account may export existing products through trusted list',async()=>{
  const c={list:async request=>request==='free'?[item]:[]};
  assert.equal(JSON.parse(await buildCatalogExport({catalog:c,request:'free',now})).products.length,1);
});
test('list is owner scoped by the trusted adapter; anonymous denial propagates',async()=>{
  const c={list:async request=>{if(!request)throw Object.assign(new Error('UNAUTHENTICATED'),{status:401});return []}};
  await assert.rejects(buildCatalogExport({catalog:c,request:null,now}),{status:401});
});
test('rejects owner, plan, prototype pollution and accessor fields without serializing them',async()=>{
  for(const bad of [{...item,ownerUid:'secret'},{...item,plan:'business'},
    Object.assign(Object.create({inherited:1}),item),
    Object.defineProperty({...item},'name',{get(){throw new Error('getter');},enumerable:true})]){
    await assert.rejects(buildCatalogExport({catalog:{list:async()=>[bad]},now}),/CATALOG_EXPORT_INVALID/);
  }
});
test('rejects invalid currency, price, ID, and duplicates',async()=>{
  for(const bad of [{...item,currency:'CLP'},{...item,priceCentavos:1.25},{...item,id:'../x'}]){
    await assert.rejects(buildCatalogExport({catalog:{list:async()=>[bad]},now}),/CATALOG_EXPORT_INVALID/);
  }
  await assert.rejects(buildCatalogExport({catalog:{list:async()=>[item,item]},now}),/CATALOG_EXPORT_INVALID/);
});
test('rejects excessive records and invalid timestamp',async()=>{
  await assert.rejects(buildCatalogExport({catalog:{list:async()=>Array(251).fill(item)},now}),/CATALOG_EXPORT_INVALID/);
  await assert.rejects(buildCatalogExport({catalog,request:'owner',now:()=>new Date(NaN)}),/CATALOG_EXPORT_INVALID/);
});
function setupUI(list){
  let handler,clicks=0,creates=0,revokes=0,blob;
  const button={disabled:false,addEventListener(type,fn){assert.equal(type,'click');handler=fn;},removeEventListener(){handler=null;}};
  const doc={createElement(type){assert.equal(type,'a');return {click(){clicks++;}};}};
  const urlApi={createObjectURL(b){creates++;blob=b;return 'blob:fake';},revokeObjectURL(){revokes++;}};
  const action=attachCatalogExportButton({button,catalog:{list},request:'owner',document:doc,urlApi,now,setTimer:fn=>fn()});
  return {button,action,trigger:()=>handler?.(),get counts(){return {clicks,creates,revokes};},get blob(){return blob;}};
}
test('download requires explicit click; blob is valid JSON and URL is revoked',async()=>{
  const ui=setupUI(async()=>[item]);
  assert.deepEqual(ui.counts,{clicks:0,creates:0,revokes:0});
  ui.trigger();await new Promise(resolve=>setImmediate(resolve));
  assert.deepEqual(ui.counts,{clicks:1,creates:1,revokes:1});
  assert.equal(JSON.parse(await ui.blob.text()).products[0].name,'Café');
});
test('switching account while list is pending discards stale download',async()=>{
  let release;const ui=setupUI(()=>new Promise(resolve=>{release=resolve;}));
  ui.trigger();ui.action.setRequest('other');release([item]);
  await new Promise(resolve=>setImmediate(resolve));
  assert.deepEqual(ui.counts,{clicks:0,creates:0,revokes:0});
  assert.equal(ui.button.disabled,false);
});
test('dispose blocks late downloads and future clicks',async()=>{
  let release;const ui=setupUI(()=>new Promise(resolve=>{release=resolve;}));
  ui.trigger();ui.action.dispose();release([item]);
  await new Promise(resolve=>setImmediate(resolve));ui.trigger();
  assert.equal(ui.counts.clicks,0);
  assert.equal(ui.button.disabled,true);
});
test('authorization error never creates a download or leaves button disabled',async()=>{
  const ui=setupUI(async()=>{throw new Error('unauthorized');});
  ui.trigger();await new Promise(resolve=>setImmediate(resolve));
  assert.equal(ui.counts.clicks,0);
  assert.equal(ui.button.disabled,false);
});
