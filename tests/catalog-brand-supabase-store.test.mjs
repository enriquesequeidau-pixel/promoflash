import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createCatalogHttpHandler} from '../v2/catalog-http.mjs';
import {createSupabaseCatalogStore} from '../v2/catalog-supabase-store.mjs';

const PROJECT='https://aaaaaaaaaaaaaaaaaaaa.supabase.co';
const PUB='test-public-key-unused';
const SERVICE='test-secret-key-unused';
const A='11111111-1111-4111-8111-111111111111';
const B='22222222-2222-4222-8222-222222222222';
const BRAND='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const draft={name:'Tienda mexicana',style:'catalog',primaryColor:'#A1B2C3'};
const brandRow={id:BRAND,owner_uid:A,name:draft.name};
const response=(body,status=200)=>new Response(JSON.stringify(body),{
  status,headers:{'Content-Type':'application/json'}
});
function fixture(fetchOverride){
  const calls=[];
  const fetcher=async(url,options)=>{
    calls.push({url,options});
    if(fetchOverride)return fetchOverride(url,options);
    if(url.endsWith('/auth/v1/user')){
      return options.headers.Authorization==='Bearer verified-test-token'
        ?response({id:A}):response({error:'invalid'},401);
    }
    if(url.includes('/rest/v1/rpc/pf_v2_create_brand_trusted'))return response(BRAND);
    if(url.includes('/rest/v1/pf_v2_brands'))return response([brandRow]);
    throw Error('UNEXPECTED_TEST_URL');
  };
  const store=createSupabaseCatalogStore({
    projectUrl:PROJECT,publishableKey:PUB,serviceRoleKey:SERVICE,fetcher});
  return {store,calls};
}

test('server-only brand RPC normalizes CSS colours, persists verified owner and reads back',async()=>{
  const {store,calls}=fixture();
  const saved=await store.createBrand(A,draft);
  assert.deepEqual(saved,{id:BRAND,ownerUid:A,name:draft.name});
  assert.equal(calls.length,2);
  assert.equal(calls[0].url,PROJECT+'/rest/v1/rpc/pf_v2_create_brand_trusted');
  assert.equal(calls[0].options.headers.apikey,SERVICE);
  assert.equal(calls[0].options.headers.Authorization,'Bearer '+SERVICE);
  assert.deepEqual(JSON.parse(calls[0].options.body),{
    p_owner_uid:A,p_name:draft.name,p_primary_color:'#A1B2C3',
    p_secondary_color:'#FFFFFF',p_accent_color:'#596BDB',
    p_phone:'',p_commercial_url:'',p_style:'catalog',p_logo_asset_id:null
  });
  assert.ok(calls[1].url.includes('id=eq.'+BRAND));
  assert.ok(calls[1].url.includes('owner_uid=eq.'+A));
});
test('server-side plan changes reject brand creation with proper HTTP code',async()=>{
  for(const [message,code] of [['PLAN_REQUIRED','PLAN_REQUIRED'],['BRAND_QUOTA','BRAND_QUOTA']]){
    const {store}=fixture(async()=>response({code:'P0001',message},400));
    await assert.rejects(store.createBrand(A,draft),{code});
  }
});
test('server rejects private logo until its owner verification is implemented',async()=>{
  const {store,calls}=fixture();
  await assert.rejects(store.createBrand(A,{...draft,
    logoAssetId:'dddddddd-dddd-4ddd-8ddd-dddddddddddd'}),{code:'INVALID_BRAND'});
  assert.deepEqual(calls,[]);
});
test('server rejects direct owner privilege spoofing and arbitrary fields',async()=>{
  const {store,calls}=fixture();
  for(const input of [{...draft,ownerUid:B},{...draft,plan:'business'},
    {...draft,commercialUrl:'http://unsafe.example'},
    {...draft,primaryColor:'expression(alert(1))'}]){
    await assert.rejects(store.createBrand(A,input),{code:'INVALID_BRAND'});
  }
  await assert.rejects(store.createBrand('anonymous',draft),{code:'UNAUTHENTICATED'});
  assert.deepEqual(calls,[]);
});
test('server read-back rejects a forged or foreign brand row',async()=>{
  for(const body of [[{...brandRow,owner_uid:B}],[{...brandRow,id:B}],[]]){
    const {store}=fixture(async(url)=>url.includes('/rpc/')?response(BRAND):response(body));
    await assert.rejects(store.createBrand(A,draft),{code:'CATALOG_UNAVAILABLE'});
  }
});
test('server rejects unexpected RPC IDs and internal SQL messages',async()=>{
  for(const result of [
    {value:'../../private',status:200},
    {value:{code:'XX000',message:'database private secret'},status:500}
  ]){
    const {store}=fixture(async()=>response(result.value,result.status));
    await assert.rejects(store.createBrand(A,draft),{code:'CATALOG_UNAVAILABLE'});
  }
});
test('local HTTP -> verified Auth -> brand SQL RPC -> guarded owner read-back',async()=>{
  const {store,calls}=fixture();
  const server=createServer(createCatalogHttpHandler({
    ...store,allowedOrigins:['https://promoflash.sequeidaulabs.com']
  }));
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try{
    const url='http://127.0.0.1:'+server.address().port+'/v2/catalog/brands';
    const auth={Authorization:'Bearer verified-test-token',
      'Content-Type':'application/json'};
    const created=await fetch(url,{method:'POST',headers:auth,
      body:JSON.stringify(draft)});
    assert.equal(created.status,201);
    assert.deepEqual(await created.json(),{brand:{id:BRAND,name:draft.name}});
    assert.equal(calls.filter(c=>c.url.endsWith('/auth/v1/user')).length,2); // initial + pre-write
    assert.equal(calls.filter(c=>c.url.includes('/rpc/')).length,1);
    assert.equal(calls.filter(c=>c.url.includes('pf_v2_brands?')).length,1);
  }finally{
    await new Promise(resolve=>{server.close(resolve);server.closeAllConnections();});
  }
});
