import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createCatalogHttpHandler} from '../v2/catalog-http.mjs';

const A='11111111-1111-4111-8111-111111111111';
const B='22222222-2222-4222-8222-222222222222';
const BRAND_A='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const BRAND_B='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const requestBody={brandId:BRAND_A,name:'Café mexicano',
  category:'food',description:'Grano de origen',priceCentavos:19900};
const ownedA={id:'p1',...requestBody,currency:'MXN',photoAssetId:null,ownerUid:A};
const ownedB={id:'p2',brandId:BRAND_B,name:'Producto B',category:'home',
  description:'',priceCentavos:200,currency:'MXN',photoAssetId:null,ownerUid:B};

function makeDeps(overrides={}){
  const calls={auth:[],lists:[],creates:[]};
  const deps={
    allowedOrigins:['https://promoflash.sequeidaulabs.com'],
    authenticateBearer:async token=>{
      calls.auth.push(token);
      if(token==='owner-one-token')return {uid:A};
      if(token==='owner-two-token')return {uid:B};
      return null;
    },
    listProducts:async uid=>{calls.lists.push(uid);return uid===A?[ownedA]:[ownedB];},
    createProduct:async(uid,draft)=>{
      calls.creates.push({uid,draft});
      return {id:'p-created',...draft,ownerUid:uid};
    },
    ...overrides
  };
  return {deps,calls};
}

async function withApi(fn,overrides={}){
  const {deps,calls}=makeDeps(overrides);
  const server=createServer(createCatalogHttpHandler(deps));
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const url='http://127.0.0.1:'+server.address().port+'/v2/catalog/products';
  const auth=(token='owner-one-token')=>({Authorization:'Bearer '+token});
  try{return await fn({url,auth,calls});}
  finally{await new Promise(resolve=>{server.close(resolve);server.closeAllConnections();});}
}
const post=(url,auth,body=requestBody,extra={})=>fetch(url,{
  method:'POST',headers:{...auth,'Content-Type':'application/json',...extra},
  body:JSON.stringify(body)
});

test('real HTTP: unauthenticated GET denied before catalog or DB read',async()=>{
  await withApi(async({url,calls})=>{
    const result=await fetch(url);
    assert.equal(result.status,401);
    assert.deepEqual(await result.json(),{error:'UNAUTHENTICATED'});
    assert.deepEqual(calls.lists,[]);
  });
});
test('real HTTP: unverified bearer is rejected, not decoded as an owner',async()=>{
  await withApi(async({url,auth,calls})=>{
    const response=await fetch(url,{headers:auth('fake.jwt.signature')});
    assert.equal(response.status,401);
    assert.deepEqual(calls.lists,[]);
  });
});
test('real HTTP: owner-scoped GET does not expose ownerUid or account B',async()=>{
  await withApi(async({url,auth,calls})=>{
    const a=await fetch(url,{headers:auth()});
    const b=await fetch(url,{headers:auth('owner-two-token')});
    assert.equal(a.status,200);assert.equal(b.status,200);
    const first=await a.json(),second=await b.json();
    assert.deepEqual(first.products.map(p=>p.id),['p1']);
    assert.deepEqual(second.products.map(p=>p.id),['p2']);
    assert.doesNotMatch(JSON.stringify(first),/ownerUid|Producto B|owner-one-token/);
    assert.deepEqual(calls.lists,[A,B]);
    assert.equal(a.headers.get('cache-control'),'no-store, max-age=0');
    assert.equal(a.headers.get('access-control-allow-origin'),null);
  });
});
test('real HTTP: explicit owner request creates MXN product with allowlisted fields',async()=>{
  await withApi(async({url,auth,calls})=>{
    const response=await post(url,auth());
    assert.equal(response.status,201);
    const value=await response.json();
    assert.equal(value.product.id,'p-created');
    assert.equal(value.product.currency,'MXN');
    assert.equal(value.product.priceCentavos,19900);
    assert.ok(!Object.hasOwn(value.product,'ownerUid'));
    assert.equal(calls.creates.length,1);
    assert.equal(calls.creates[0].uid,A);
    assert.ok(!Object.hasOwn(calls.creates[0].draft,'ownerUid'));
    assert.ok(!Object.hasOwn(calls.creates[0].draft,'plan'));
  });
});
test('real HTTP: browser cannot forge owner, paid plan or currency in JSON',async()=>{
  await withApi(async({url,auth,calls})=>{
    for(const extra of [{ownerUid:B},{plan:'business'},{currency:'CLP'},{payment_verified:true}]){
      const response=await post(url,auth(),{...requestBody,...extra});
      assert.equal(response.status,422);
    }
    assert.deepEqual(calls.creates,[]);
  });
});
test('real HTTP: existing Free user can read, but server-only plan denies create',async()=>{
  await withApi(async({url,auth})=>{
    const list=await fetch(url,{headers:auth()});
    assert.equal(list.status,200);
    const create=await post(url,auth());
    assert.equal(create.status,403);
    assert.deepEqual(await create.json(),{error:'PLAN_REQUIRED'});
  },{createProduct:async()=>{throw Object.assign(Error('PLAN_REQUIRED'),{code:'PLAN_REQUIRED'});}});
});
test('real HTTP: quota conflict returns 409, never makes a successful promise',async()=>{
  await withApi(async({url,auth})=>{
    const response=await post(url,auth());
    assert.equal(response.status,409);
    assert.deepEqual(await response.json(),{error:'PRODUCT_QUOTA'});
  },{createProduct:async()=>{throw Object.assign(Error('PRODUCT_QUOTA'),{code:'PRODUCT_QUOTA'});}});
});
test('real HTTP: foreign brand cannot be written through owner-scoped store',async()=>{
  await withApi(async({url,auth})=>{
    const response=await post(url,auth(),{...requestBody,brandId:BRAND_B});
    assert.equal(response.status,404);
    assert.deepEqual(await response.json(),{error:'BRAND_NOT_FOUND'});
  },{createProduct:async()=>{throw Object.assign(Error('BRAND_NOT_FOUND'),{code:'BRAND_NOT_FOUND'});}});
});
test('real HTTP: missing trusted identity, denied origin and missing token all fail closed',async()=>{
  await withApi(async({url,calls})=>{
    const denied=await post(url,{},requestBody);
    const origin=await post(url,{Authorization:'Bearer owner-one-token'},requestBody,
      {Origin:'https://evil.example'});
    assert.equal(denied.status,401);assert.equal(origin.status,403);
    assert.deepEqual(calls.auth,[]);
    assert.deepEqual(calls.creates,[]);
  });
});
test('real HTTP: allowed same-origin POST, no permissive CORS headers',async()=>{
  await withApi(async({url,auth})=>{
    const response=await post(url,auth(),requestBody,
      {Origin:'https://promoflash.sequeidaulabs.com'});
    assert.equal(response.status,201);
    assert.equal(response.headers.get('access-control-allow-origin'),null);
  });
});
test('real HTTP: malformed JSON and wrong media types never reach the store',async()=>{
  await withApi(async({url,auth,calls})=>{
    const wrong=await fetch(url,{method:'POST',headers:auth(),
      body:'arbitrary'});
    const broken=await fetch(url,{method:'POST',headers:{...auth(),'Content-Type':'application/json'},
      body:'{bad'});
    assert.equal(wrong.status,415);assert.equal(broken.status,400);
    assert.deepEqual(calls.creates,[]);
  });
});
test('real HTTP: payloads larger than 16KiB fail without database access',async()=>{
  await withApi(async({url,auth,calls})=>{
    const response=await post(url,auth(),{...requestBody,description:'x'.repeat(20_000)});
    assert.equal(response.status,413);
    assert.deepEqual(calls.creates,[]);
  });
});
test('real HTTP: invalid stored data fails closed and never emits private fields',async()=>{
  await withApi(async({url,auth})=>{
    const response=await fetch(url,{headers:auth()});
    assert.equal(response.status,503);
    assert.deepEqual(await response.json(),{error:'CATALOG_UNAVAILABLE'});
  },{listProducts:async()=>[{...ownedA,currency:'CLP'}]});
});
test('real HTTP: internal SQL/provider failures do not leak secrets',async()=>{
  await withApi(async({url,auth})=>{
    const response=await post(url,auth());
    assert.equal(response.status,503);
    const body=await response.text();
    assert.equal(body,'{"error":"CATALOG_UNAVAILABLE"}');
    assert.doesNotMatch(body,/SECRET|connection|password/);
  },{createProduct:async()=>{throw Error('SECRET connection password');}});
});
test('real HTTP: unsupported methods and routes never attempt identity verification',async()=>{
  await withApi(async({url,auth,calls})=>{
    const wrong=await fetch(url,{method:'PUT',headers:auth()});
    const path=await fetch(url+'?owner='+B,{headers:auth()});
    assert.equal(wrong.status,405);assert.equal(path.status,404);
    assert.deepEqual(calls.auth,[]);
  });
});

test('real HTTP: malicious owner-scoped read never leaks another tenant',async()=>{
  await withApi(async({url,auth})=>{
    const response=await fetch(url,{headers:auth()});
    assert.equal(response.status,503);
    assert.equal((await response.json()).error,'CATALOG_UNAVAILABLE');
  },{listProducts:async()=>[ownedB]});
});
test('real HTTP: a service adapter cannot return a product for a different owner',async()=>{
  await withApi(async({url,auth})=>{
    const response=await post(url,auth());
    assert.equal(response.status,503);
    assert.equal((await response.json()).error,'CATALOG_UNAVAILABLE');
  },{createProduct:async()=>ownedB});
});
test('real HTTP: product missing explicit owner is rejected before returning data',async()=>{
  await withApi(async({url,auth})=>{
    const response=await fetch(url,{headers:auth()});
    assert.equal(response.status,503);
  },{listProducts:async()=>[{...requestBody,id:'p3',currency:'MXN'}]});
});


test('real HTTP: revocation during pending product read denies private payload',async()=>{
  let release,entered,active=true;
  const started=new Promise(resolve=>{entered=resolve;});
  const verifications=[];
  await withApi(async({url,auth})=>{
    const request=fetch(url,{headers:auth()});
    await started;
    active=false;
    release();
    const response=await request;
    assert.equal(response.status,401);
    assert.deepEqual(await response.json(),{error:'UNAUTHENTICATED'});
    assert.deepEqual(verifications,['owner-one-token','owner-one-token']);
  },{
    authenticateBearer:async token=>{
      verifications.push(token);
      return active&&token==='owner-one-token'?{uid:A}:null;
    },
    listProducts:async uid=>{
      assert.equal(uid,A);
      await new Promise(resolve=>{release=resolve;entered();});
      return [ownedA];
    }
  });
});

test('real HTTP: identity reassignment during product read fails closed',async()=>{
  let release,entered,currentUid=A;
  const started=new Promise(resolve=>{entered=resolve;});
  await withApi(async({url,auth})=>{
    const request=fetch(url,{headers:auth()});
    await started;
    currentUid=B;
    release();
    const response=await request;
    assert.equal(response.status,401);
    assert.deepEqual(await response.json(),{error:'UNAUTHENTICATED'});
  },{
    authenticateBearer:async token=>token==='owner-one-token'?{uid:currentUid}:null,
    listProducts:async uid=>{
      assert.equal(uid,A);
      await new Promise(resolve=>{release=resolve;entered();});
      return [ownedA];
    }
  });
});
