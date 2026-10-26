import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createCatalogHttpHandler} from '../v2/catalog-http.mjs';

const A='11111111-1111-4111-8111-111111111111';
const B='22222222-2222-4222-8222-222222222222';
const BRAND_ID='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const draft={name:'Tienda ficticia',primaryColor:'#102030',style:'catalog'};

async function withServer(callback,overrides={}){
  const calls={auth:[],create:[],list:[]};
  const deps={
    allowedOrigins:['https://promoflash.sequeidaulabs.com'],
    authenticateBearer:async token=>{
      calls.auth.push(token);
      return token==='owner-one-token'?{uid:A}:null;
    },
    listProducts:async()=>[],
    createProduct:async()=>{throw Error('product not used')},
    listBrands:async uid=>{calls.list.push(uid);return [];},
    createBrand:async(uid,input)=>{
      calls.create.push({uid,input});
      return {id:BRAND_ID,ownerUid:uid,name:input.name};
    },
    ...overrides
  };
  const server=createServer(createCatalogHttpHandler(deps));
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const url='http://127.0.0.1:'+server.address().port+'/v2/catalog/brands';
  const auth={Authorization:'Bearer owner-one-token'};
  const post=(body=draft,headers={})=>fetch(url,{
    method:'POST',headers:{...auth,'Content-Type':'application/json',...headers},
    body:JSON.stringify(body)
  });
  try{return await callback({url,auth,post,calls});}
  finally{await new Promise(resolve=>{server.close(resolve);server.closeAllConnections();});}
}
test('real HTTP POST creates branded profile with owner derived from verified session',async()=>{
  await withServer(async({post,calls})=>{
    const res=await post();
    assert.equal(res.status,201);
    assert.deepEqual(await res.json(),{brand:{id:BRAND_ID,name:draft.name}});
    assert.equal(res.headers.get('cache-control'),'no-store, max-age=0');
    assert.equal(res.headers.get('access-control-allow-origin'),null);
    assert.equal(calls.create[0].uid,A);
    assert.deepEqual(calls.create[0].input,{
      name:draft.name,primaryColor:'#102030',secondaryColor:'#FFFFFF',
      accentColor:'#596BDB',phone:'',commercialUrl:'',
      style:'catalog',logoAssetId:null
    });
    assert.equal(calls.auth.length,2); // initial identity + pre-write revalidation
  });
});
test('real HTTP POST cannot set owner, plan or payment verification in JSON',async()=>{
  await withServer(async({post,calls})=>{
    for(const injected of [{ownerUid:B},{plan:'business'},{payment_verified:true},
      {owner_uid:B},{isAdmin:true}]){
      const res=await post({...draft,...injected});
      assert.equal(res.status,422);
      assert.equal((await res.json()).error,'INVALID_BRAND');
    }
    assert.deepEqual(calls.create,[]);
  });
});
test('real HTTP requires valid token before reading or creating brands',async()=>{
  await withServer(async({url,calls})=>{
    for(const headers of [{},{Authorization:'Bearer invalid-session'}]){
      const res=await fetch(url,{method:'POST',
        headers:{...headers,'Content-Type':'application/json'},
        body:JSON.stringify(draft)});
      assert.equal(res.status,401);
    }
    assert.deepEqual(calls.create,[]);
  });
});
test('real HTTP rejects unauthorized origin before token verification',async()=>{
  await withServer(async({post,calls})=>{
    const res=await post(draft,{Origin:'https://malicious.example'});
    assert.equal(res.status,403);
    assert.equal(calls.auth.length,0);
    assert.equal(calls.create.length,0);
  });
});
test('real HTTP maps Business brand quota reached to 409',async()=>{
  await withServer(async({post})=>{
    const res=await post();
    assert.equal(res.status,409);
    assert.deepEqual(await res.json(),{error:'BRAND_QUOTA'});
  },{createBrand:async()=>{throw Object.assign(Error('BRAND_QUOTA'),{code:'BRAND_QUOTA'});}});
});
test('real HTTP maps Free or cancelled plan to 403',async()=>{
  await withServer(async({post})=>{
    const res=await post();
    assert.equal(res.status,403);
    assert.deepEqual(await res.json(),{error:'PLAN_REQUIRED'});
  },{createBrand:async()=>{throw Object.assign(Error('PLAN_REQUIRED'),{code:'PLAN_REQUIRED'});}});
});
test('real HTTP fails closed if trusted store returns foreign owner row',async()=>{
  await withServer(async({post})=>{
    const res=await post();
    assert.equal(res.status,503);
    assert.deepEqual(await res.json(),{error:'CATALOG_UNAVAILABLE'});
  },{createBrand:async()=>({id:BRAND_ID,name:draft.name,ownerUid:B})});
});
test('real HTTP denies private logo metadata until backend verifies asset ownership',async()=>{
  await withServer(async({post})=>{
    const res=await post({...draft,logoAssetId:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'});
    assert.equal(res.status,422);
  },{createBrand:async()=>{throw Object.assign(Error('INVALID_BRAND'),{code:'INVALID_BRAND'});}});
});
test('real HTTP rejects invalid style, price field and malformed brand name',async()=>{
  await withServer(async({post,calls})=>{
    for(const input of [
      {...draft,style:'not-a-style'}, {...draft,priceCentavos:200},
      {...draft,name:''},{...draft,name:'X'.repeat(61)}
    ]){
      const res=await post(input);assert.equal(res.status,422);
    }
    assert.deepEqual(calls.create,[]);
  });
});
test('real HTTP rejects unsupported media and oversize payload without store calls',async()=>{
  await withServer(async({url,auth,post,calls})=>{
    const media=await fetch(url,{method:'POST',headers:auth,body:'test'});
    const huge=await post({...draft,phone:'7'.repeat(20_000)});
    assert.equal(media.status,415);
    assert.equal(huge.status,413);
    assert.deepEqual(calls.create,[]);
  });
});
test('real HTTP: POST remains disabled when trusted createBrand dependency is absent',async()=>{
  await withServer(async({url,auth,calls})=>{
    const res=await fetch(url,{method:'POST',headers:auth});
    assert.equal(res.status,405);
    assert.equal(res.headers.get('allow'),'GET');
    assert.deepEqual(calls.auth,[]);
  },{createBrand:undefined});
});


test('real HTTP: revocation while listing brands never exposes private brand name',async()=>{
  let release,entered,active=true;
  const started=new Promise(resolve=>{entered=resolve;});
  const verifications=[];
  await withServer(async({url,auth})=>{
    const request=fetch(url,{headers:auth});
    await started;
    active=false;
    release();
    const response=await request;
    assert.equal(response.status,401);
    const body=await response.text();
    assert.equal(body,'{"error":"UNAUTHENTICATED"}');
    assert.doesNotMatch(body,/Tienda ficticia|ownerUid/);
    assert.deepEqual(verifications,['owner-one-token','owner-one-token']);
  },{
    authenticateBearer:async token=>{
      verifications.push(token);
      return active&&token==='owner-one-token'?{uid:A}:null;
    },
    listBrands:async uid=>{
      assert.equal(uid,A);
      await new Promise(resolve=>{release=resolve;entered();});
      return [{id:BRAND_ID,ownerUid:A,name:draft.name}];
    }
  });
});
