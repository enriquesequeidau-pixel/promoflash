import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createSupabaseCatalogStore} from '../v2/catalog-supabase-store.mjs';
import {createCatalogHttpHandler} from '../v2/catalog-http.mjs';

const HOST='https://aaaaaaaaaaaaaaaaaaaa.supabase.co';
const PUB='test-publishable-key-not-real';
const SERVICE='test-server-key-not-real';
const A='11111111-1111-4111-8111-111111111111';
const B='22222222-2222-4222-8222-222222222222';
const BRAND='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const PRODUCT='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const dbProduct={id:PRODUCT,owner_uid:A,brand_id:BRAND,name:'Café mexicano',
  description:'Grano',category:'food',price_centavos:19900,
  currency:'MXN',photo_asset_id:null};
const input={brandId:BRAND,name:'Café mexicano',description:'Grano',
  category:'food',priceCentavos:19900};
const ok=(value,status=200)=>new Response(JSON.stringify(value),{
  status,headers:{'Content-Type':'application/json'}
});

function fixture(overrides={}){
  const calls=[];
  const fakeFetch=async(url,options)=>{
    calls.push({url,options});
    if(url===HOST+'/auth/v1/user'){
      return options.headers.Authorization==='Bearer verified-test-token'
        ?ok({id:A}):ok({error:'invalid_session'},401);
    }
    if(url.includes('/rest/v1/rpc/'))return ok(PRODUCT);
    if(url.includes('/rest/v1/pf_v2_products'))return ok([dbProduct]);
    throw Error('UNEXPECTED_BACKEND_URL');
  };
  const store=createSupabaseCatalogStore({
    projectUrl:HOST,publishableKey:PUB,serviceRoleKey:SERVICE,
    fetcher:overrides.fetcher??fakeFetch
  });
  return {store,calls};
}

test('Supabase Auth server verifies bearer and returns canonical account id',async()=>{
  const {store,calls}=fixture();
  assert.deepEqual(await store.authenticateBearer('verified-test-token'),{uid:A});
  assert.equal(await store.authenticateBearer('forged-test-token'),null);
  assert.equal(calls.length,2);
  assert.equal(calls[0].url,HOST+'/auth/v1/user');
  assert.equal(calls[0].options.headers.apikey,PUB);
  assert.equal(calls[0].options.headers.Authorization,'Bearer verified-test-token');
  assert.ok(!JSON.stringify(calls[0]).includes(SERVICE));
});
test('Supabase owner-scoped list uses privileged key without returning secrets or owner metadata',async()=>{
  const {store,calls}=fixture();
  const products=await store.listProducts(A);
  assert.equal(products.length,1);
  assert.equal(products[0].id,PRODUCT);
  assert.equal(products[0].ownerUid,A);
  assert.equal(products[0].priceCentavos,19900);
  assert.ok(!('owner_uid' in products[0]));
  assert.match(calls[0].url,/owner_uid=eq\.11111111-1111-4111-8111-111111111111/);
  assert.equal(calls[0].options.headers.apikey,SERVICE);
  assert.equal(calls[0].options.headers.Authorization,'Bearer '+SERVICE);
  assert.equal(calls[0].options.cache,'no-store');
});
test('create calls server-side SQL RPC with owner and read-back of created product',async()=>{
  const {store,calls}=fixture();
  const created=await store.createProduct(A,input);
  assert.equal(created.id,PRODUCT);
  assert.equal(calls.length,2);
  assert.equal(calls[0].url,HOST+'/rest/v1/rpc/pf_v2_create_product_trusted');
  const body=JSON.parse(calls[0].options.body);
  assert.deepEqual(body,{
    p_owner_uid:A,p_brand_id:BRAND,p_name:'Café mexicano',
    p_category:'food',p_price_centavos:19900,p_description:'Grano',
    p_photo_asset_id:null
  });
  assert.ok(!('plan' in body)&&!('ownerUid' in body));
  assert.ok(calls[1].url.includes('id=eq.'+PRODUCT));
  assert.ok(calls[1].url.includes('owner_uid=eq.'+A));
});
test('write-side PDF/Photo reference cannot bypass unimplemented owner validation',async()=>{
  const {store,calls}=fixture();
  await assert.rejects(store.createProduct(A,{...input,
    photoAssetId:'dddddddd-dddd-4ddd-8ddd-dddddddddddd'}),{code:'INVALID_PRODUCT'});
  assert.deepEqual(calls,[]);
});
test('free or expired plans map verified RPC denial to PLAN_REQUIRED',async()=>{
  const {store}=fixture({fetcher:async()=>ok({code:'P0001',message:'PLAN_REQUIRED'},400)});
  await assert.rejects(store.createProduct(A,input),{code:'PLAN_REQUIRED'});
});
test('concurrent quota denial maps to PRODUCT_QUOTA',async()=>{
  const {store}=fixture({fetcher:async()=>ok({code:'P0001',message:'PRODUCT_QUOTA'},400)});
  await assert.rejects(store.createProduct(A,input),{code:'PRODUCT_QUOTA'});
});
test('cross-tenant brand foreign key maps to masked BRAND_NOT_FOUND',async()=>{
  const {store}=fixture({fetcher:async()=>ok({code:'23503',message:'constraint failure'},409)});
  await assert.rejects(store.createProduct(A,input),{code:'BRAND_NOT_FOUND'});
});
test('unexpected PostgreSQL details fail closed without leaking',async()=>{
  const {store}=fixture({fetcher:async()=>ok({
    code:'XX000',message:'private database hostname and secret'
  },500)});
  await assert.rejects(store.createProduct(A,input),{code:'CATALOG_UNAVAILABLE'});
});
test('backend response for a different owner is rejected before HTTP serialization',async()=>{
  const {store}=fixture({fetcher:async(url)=>url.includes('/rest/v1/')
    ?ok([{...dbProduct,owner_uid:B}]):ok({id:A})});
  await assert.rejects(store.listProducts(A),{code:'CATALOG_UNAVAILABLE'});
});
test('unexpected RPC ID, SQL schema or missing row always fails closed',async()=>{
  const {store}=fixture({fetcher:async url=>url.includes('/rpc/')
    ?ok('../../private'):ok([dbProduct])});
  await assert.rejects(store.createProduct(A,input),{code:'CATALOG_UNAVAILABLE'});
});
test('server adapter rejects invalid project URLs and reused public/secret key',()=>{
  assert.throws(()=>createSupabaseCatalogStore({projectUrl:'https://example.com',
    publishableKey:PUB,serviceRoleKey:SERVICE,fetcher:async()=>{}}),TypeError);
  assert.throws(()=>createSupabaseCatalogStore({projectUrl:HOST,
    publishableKey:PUB,serviceRoleKey:PUB,fetcher:async()=>{}}),TypeError);
  assert.throws(()=>createSupabaseCatalogStore({projectUrl:HOST,
    publishableKey:PUB,serviceRoleKey:SERVICE}),TypeError);
});
test('real local HTTP -> verified Supabase Auth mock -> RPC mock -> owner-checked GET',async()=>{
  const {store,calls}=fixture();
  const handler=createCatalogHttpHandler({...store,
    allowedOrigins:['https://promoflash.sequeidaulabs.com']});
  const server=createServer(handler);
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try{
    const url='http://127.0.0.1:'+server.address().port+'/v2/catalog/products';
    const headers={Authorization:'Bearer verified-test-token',
      'Content-Type':'application/json'};
    const created=await fetch(url,{method:'POST',headers,body:JSON.stringify(input)});
    assert.equal(created.status,201);
    const payload=await created.json();
    assert.equal(payload.product.id,PRODUCT);
    assert.ok(!JSON.stringify(payload).includes('ownerUid'));
    const listed=await fetch(url,{headers});
    assert.equal(listed.status,200);
    assert.equal((await listed.json()).products[0].id,PRODUCT);
    assert.equal(calls.filter(x=>x.url.endsWith('/auth/v1/user')).length,2);
    assert.equal(calls.filter(x=>x.url.includes('/rest/v1/rpc/')).length,1);
  }finally{
    await new Promise(resolve=>{server.close(resolve);server.closeAllConnections();});
  }
});
