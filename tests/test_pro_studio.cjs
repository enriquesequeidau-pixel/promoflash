const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

function sandbox() {
  const saved=[];
  let handler;
  const fakeUser={id:'test-owner-id',email:'owner@example.test'};
  const source=fs.readFileSync('api-contracts/pro-studio.ts','utf8')
    .replace(/^import \{createClient\} from "npm:[^"]+";\s*/,'')
    .replace('b:unknown','b')
    .replace('let input:any','let input')
    .replace('voice as keyof typeof templates','voice');
  const Deno={env:{get:key=>({
    SUPABASE_URL:'https://sandbox.invalid',
    SUPABASE_ANON_KEY:'test-public',
    SUPABASE_SERVICE_ROLE_KEY:'test-secret'
  }[key]||'')},serve:callback=>{handler=callback;}};
  const createClient=(url,key)=>{
    assert.equal(url,'https://sandbox.invalid');
    if(key==='test-public')return {auth:{getUser:async token=>{
      assert.equal(token,'test-jwt');
      return {data:{user:fakeUser},error:null};
    }}};
    assert.equal(key,'test-secret');
    return {from:table=>{
      if(table==='pro_entitlements')return {
        select:()=>({eq:(field,id)=>{
          assert.equal(field,'user_id');assert.equal(id,fakeUser.id);
          return {maybeSingle:async()=>({data:{active:true},error:null})};
        }})
      };
      if(table==='pro_brand_kits')return {upsert:async record=>{
        assert.equal(record.user_id,fakeUser.id);
        saved.push(record);
        return {error:null};
      }};
      throw Error('Unknown table '+table);
    }};
  };
  vm.runInNewContext(source,{Deno,createClient,Response,Request,console,TextEncoder});
  assert.equal(typeof handler,'function');
  const request=payload=>handler(new Request('https://edge.example/pro-studio',{
    method:'POST',
    headers:{authorization:'Bearer test-jwt','content-type':'application/json'},
    body:typeof payload==='string'?payload:JSON.stringify(payload)
  }));
  return {request,saved};
}

test('server refuses forged ownership, privileges or billing fields before writing',async()=>{
  const mock=sandbox();
  for(const item of [
    {shop:'Example',product:'Soap',voice:'cercano',user_id:'victim'},
    {shop:'Example',product:'Soap',voice:'elegante',plan:'pro'},
    {shop:'Example',product:'Soap',voice:'cercano',isAdmin:true},
    {shop:'Example',product:'Soap',voice:'cercano',price_mxn:1},
    '[1,2]', 'malformed json'
  ]){
    const response=await mock.request(item);
    assert.equal(response.status,400,JSON.stringify(item));
  }
  assert.equal(mock.saved.length,0);
});

test('valid Pro Studio response only contains marketing copy and authenticated owner is enforced',async()=>{
  const mock=sandbox();
  const response=await mock.request({shop:'Feria Local',product:'Jabón',voice:'elegante'});
  assert.equal(response.status,200);
  const payload=await response.json();
  assert.deepEqual(Object.keys(payload).sort(),['brand_saved','headlines','cta'].sort());
  assert.equal(payload.brand_saved,true);
  assert.equal(payload.headlines.length,3);
  assert.equal(mock.saved.length,1);
  assert.equal(mock.saved[0].user_id,'test-owner-id');
  assert.equal(mock.saved[0].shop_name,'Feria Local');
  assert.equal(payload.user_id,undefined);
  assert.equal(payload.access_token,undefined);
});
