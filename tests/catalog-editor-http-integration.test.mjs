import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createCatalogHttpHandler} from '../v2/catalog-http.mjs';
import {createCatalogEditorHttpClient} from '../v2/catalog-editor-http-client.mjs';
import {attachCatalogEditorButton} from '../v2/catalog-editor-bridge.mjs';

const A='11111111-1111-4111-8111-111111111111';
const B='22222222-2222-4222-8222-222222222222';
const BRAND_A='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const BRAND_B='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const PRODUCT={id:'product-a',brandId:BRAND_A,name:'Café mexicano',
  category:'food',description:'Grano',priceCentavos:19900,
  currency:'MXN',photoAssetId:null,ownerUid:A};
const PRODUCT_B={...PRODUCT,id:'product-b',brandId:BRAND_B,ownerUid:B};
const BRANDS_A=[{id:BRAND_A,ownerUid:A,name:'CAFÉ DE CASA'}];
const BRANDS_B=[{id:BRAND_B,ownerUid:B,name:'TIENDA B'}];
const tick=()=>new Promise(resolve=>setImmediate(resolve));

async function withServer(fn,overrides={}){
  const calls={auth:[],products:[],brands:[]};
  const deps={
    authenticateBearer:async token=>{
      calls.auth.push(token);
      if(token==='owner-one-token')return {uid:A};
      if(token==='owner-two-token')return {uid:B};
      return null;
    },
    listProducts:async uid=>{
      calls.products.push(uid);return uid===A?[PRODUCT]:[PRODUCT_B];
    },
    listBrands:async uid=>{
      calls.brands.push(uid);return uid===A?BRANDS_A:BRANDS_B;
    },
    createProduct:async()=>{throw Error('Not used in this read-only test');},
    ...overrides
  };
  const server=createServer(createCatalogHttpHandler(deps));
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base='http://127.0.0.1:'+server.address().port;
  const httpCalls=[];
  const client=createCatalogEditorHttpClient({fetcher:(path,options)=>{
    httpCalls.push({path,options});
    return fetch(base+path,options);
  }});
  try{return await fn({base,calls,httpCalls,client});}
  finally{await new Promise(resolve=>{server.close(resolve);server.closeAllConnections();});}
}
function fakeEditor(client,token='owner-one-token'){
  let handler,categoryClicks=0,inputEvents=0;
  const controls=Object.fromEntries(['productName','price','brand'].map(id=>[
    id,{value:'FREE-UNCHANGED',dispatchEvent(event){
      assert.equal(event.type,'input');inputEvents++;
    }}
  ]));
  const doc={
    getElementById:id=>controls[id]??null,
    querySelector:selector=>selector==='.category[data-category="food"]'
      ?{click(){categoryClicks++;}}:null
  };
  const button={disabled:false,
    addEventListener(type,fn){assert.equal(type,'click');handler=fn;},
    removeEventListener(){handler=null;}
  };
  const select={value:'product-a'},errors=[];
  const action=attachCatalogEditorButton({button,select,request:token,doc,
    ...client,eventFactory:()=>({type:'input'}),
    onError:e=>errors.push(e.code??e.message)});
  return {action,button,select,controls,errors,
    click:()=>handler?.(),get categoryClicks(){return categoryClicks;},
    get inputEvents(){return inputEvents;}};
}

test('real HTTP product + brand lookup populates existing editor only after explicit click',async()=>{
  await withServer(async({client,calls,httpCalls})=>{
    const ui=fakeEditor(client);
    assert.deepEqual(Object.values(ui.controls).map(x=>x.value),
      ['FREE-UNCHANGED','FREE-UNCHANGED','FREE-UNCHANGED']);
    assert.deepEqual(calls.auth,[]);
    ui.click();await tick();await tick();
    assert.deepEqual([ui.controls.productName.value,ui.controls.price.value,ui.controls.brand.value],
      ['Café mexicano','$199.00 MXN','CAFÉ DE CASA']);
    assert.equal(ui.categoryClicks,1);assert.equal(ui.inputEvents,3);
    assert.deepEqual(calls.products,[A]);assert.deepEqual(calls.brands,[A]);
    assert.deepEqual(ui.errors,[]);
    assert.deepEqual(httpCalls.map(c=>c.path),['/v2/catalog/products','/v2/catalog/brands']);
    for(const c of httpCalls){
      assert.equal(c.options.credentials,'omit');
      assert.equal(c.options.cache,'no-store');
      assert.equal(c.options.mode,'same-origin');
      assert.equal(c.options.headers.Authorization,'Bearer owner-one-token');
    }
  });
});
test('Free anonymous request cannot read brands or products or change editor',async()=>{
  await withServer(async({client,calls})=>{
    const ui=fakeEditor(client,null);
    ui.click();await tick();
    assert.equal(ui.errors[0],'UNAUTHENTICATED');
    assert.equal(ui.categoryClicks,0);
    assert.equal(ui.inputEvents,0);
    assert.deepEqual(calls.auth,[]);
  });
});
test('forged bearer token fails server verification before private reads',async()=>{
  await withServer(async({client,calls})=>{
    const ui=fakeEditor(client,'forged-session-token');
    ui.click();await tick();await tick();
    assert.equal(ui.errors[0],'UNAUTHENTICATED');
    assert.equal(ui.categoryClicks,0);
    assert.deepEqual(calls.products,[]);assert.deepEqual(calls.brands,[]);
  });
});
test('foreign brand name is not accessible even when product refers to it',async()=>{
  await withServer(async({client,calls})=>{
    const ui=fakeEditor(client);
    ui.click();await tick();await tick();
    assert.equal(ui.categoryClicks,0);
    assert.equal(ui.errors[0],'BRAND_NOT_FOUND');
    assert.deepEqual(calls.brands,[A]);
  },{listProducts:async uid=>[{...PRODUCT,brandId:BRAND_B}]});
});
test('server rejects cross-tenant brand row without exposing owner or private name',async()=>{
  await withServer(async({client})=>{
    const ui=fakeEditor(client);
    ui.click();await tick();await tick();
    assert.equal(ui.categoryClicks,0);
    assert.equal(ui.errors[0],'CATALOG_UNAVAILABLE');
  },{listBrands:async()=>BRANDS_B});
});
test('changing session during delayed brand lookup prevents stale editor mutation',async()=>{
  let release;
  await withServer(async({client,calls})=>{
    const ui=fakeEditor(client);
    ui.click();await tick();
    assert.equal(calls.brands.length,1);
    ui.action.setRequest('owner-two-token');
    release(BRANDS_A);
    await tick();await tick();
    assert.equal(ui.categoryClicks,0);
    assert.equal(ui.inputEvents,0);
    assert.equal(ui.button.disabled,false);
    assert.deepEqual(ui.errors,[]);
  },{listBrands:()=>new Promise(resolve=>{release=resolve;})});
});
test('malformed backend response and duplicate brand IDs fail closed',async()=>{
  await withServer(async({client})=>{
    const ui=fakeEditor(client);
    ui.click();await tick();await tick();
    assert.equal(ui.categoryClicks,0);
    assert.equal(ui.errors[0],'CATALOG_UNAVAILABLE');
  },{listBrands:async()=>[BRANDS_A[0],BRANDS_A[0]]});
});
test('GET brands strips private fields and disables cache',async()=>{
  await withServer(async({base})=>{
    const response=await fetch(base+'/v2/catalog/brands',{
      headers:{Authorization:'Bearer owner-one-token'}
    });
    assert.equal(response.status,200);
    assert.equal(response.headers.get('cache-control'),'no-store, max-age=0');
    assert.equal(response.headers.get('access-control-allow-origin'),null);
    assert.deepEqual(await response.json(),{brands:[{id:BRAND_A,name:'CAFÉ DE CASA'}]});
  });
});
test('POST brand endpoint and anonymous GET fail before accessing store',async()=>{
  await withServer(async({base,calls})=>{
    const denied=await fetch(base+'/v2/catalog/brands');
    const post=await fetch(base+'/v2/catalog/brands',{
      method:'POST',headers:{Authorization:'Bearer owner-one-token'}
    });
    assert.equal(denied.status,401);
    assert.equal(post.status,405);
    assert.equal(post.headers.get('allow'),'GET');
    assert.deepEqual(calls.brands,[]);
    assert.deepEqual(calls.auth,[]);
  });
});
