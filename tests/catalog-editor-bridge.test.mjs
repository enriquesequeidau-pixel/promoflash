import test from 'node:test';
import assert from 'node:assert/strict';
import {catalogEditorDraft,applyCatalogDraft,attachCatalogEditorButton} from '../v2/catalog-editor-bridge.mjs';

const BRAND='11111111-1111-4111-8111-111111111111';
const product={id:'p1',brandId:BRAND,name:'Café mexicano',description:'Grano',
  category:'food',priceCentavos:19900,currency:'MXN',photoAssetId:null};
const tick=()=>new Promise(resolve=>setImmediate(resolve));

function fixture({list=async()=>[product],getName=async()=> 'CAFÉ DE CASA'}={}){
  let handler,categoryClicks=0,events=0;
  const fields=Object.fromEntries(['productName','price','brand'].map(id=>[id,{
    value:'old',dispatchEvent(e){assert.equal(e.type,'input');events++;}
  }]));
  const category={click(){categoryClicks++;for(const field of Object.values(fields))field.value='example';}};
  const doc={
    getElementById:id=>fields[id]??null,
    querySelector:selector=>selector==='.category[data-category="food"]'?category:null
  };
  const button={disabled:false,addEventListener(type,fn){assert.equal(type,'click');handler=fn;},
    removeEventListener(){handler=null;}};
  const select={value:'p1'};
  const errors=[],requests=[];
  const action=attachCatalogEditorButton({button,select,request:'owner',doc,
    catalog:{list:async identity=>{requests.push(identity);return list(identity);}},
    brands:{getName},eventFactory:()=>({type:'input'}),onError:error=>errors.push(error)});
  return {action,doc,fields,button,select,errors,requests,trigger:()=>handler?.(),
    get clicks(){return categoryClicks;},get events(){return events;}};
}

test('converts trusted product to Free editor fields with exact MXN price',()=>{
  assert.deepEqual(catalogEditorDraft(product,' CAFÉ DE CASA '),{
    category:'food',productName:'Café mexicano',price:'$199.00 MXN',brand:'CAFÉ DE CASA'
  });
});
test('rejects overlong names instead of truncating saved catalog data',()=>{
  assert.throws(()=>catalogEditorDraft({...product,name:'x'.repeat(47)},'Tienda'),/NAME_TOO_LONG/);
  assert.throws(()=>catalogEditorDraft(product,'T'.repeat(29)),/BRAND_INVALID/);
});
test('rejects malformed catalog fields and accessor injection',()=>{
  for(const bad of [{...product,currency:'CLP'},{...product,ownerUid:'another'},
    Object.defineProperty({...product},'name',{get(){throw Error('getter');}})]){
    assert.throws(()=>catalogEditorDraft(bad,'Tienda'),/CATALOG_EDITOR_INVALID_PRODUCT/);
  }
});
test('explicit click loads selected own product; updates Free preview through input events',async()=>{
  const f=fixture();
  assert.equal(f.fields.productName.value,'old');
  f.trigger();await tick();
  assert.equal(f.clicks,1);
  assert.equal(f.events,3);
  assert.deepEqual([f.fields.productName.value,f.fields.price.value,f.fields.brand.value],
    ['Café mexicano','$199.00 MXN','CAFÉ DE CASA']);
  assert.deepEqual(f.requests,['owner']);
  assert.equal(f.button.disabled,false);
  assert.deepEqual(f.errors,[]);
});
test('owner-scoped list denial prevents any editor update',async()=>{
  const f=fixture({list:async()=>{throw Object.assign(Error('UNAUTHENTICATED'),{status:401});}});
  f.trigger();await tick();
  assert.equal(f.clicks,0);
  assert.equal(f.errors[0].status,401);
  assert.equal(f.button.disabled,false);
});
test('product missing from scoped list cannot be applied',async()=>{
  const f=fixture({list:async()=>[]});
  f.trigger();await tick();
  assert.equal(f.clicks,0);
  assert.match(f.errors[0].message,/SELECTION/);
});
test('duplicate product IDs are rejected without any editor mutation',async()=>{
  const f=fixture({list:async()=>[product,product]});
  f.trigger();await tick();
  assert.equal(f.clicks,0);
  assert.match(f.errors[0].message,/SELECTION/);
});
test('account change during pending list cannot apply stale product',async()=>{
  let release;
  const f=fixture({list:()=>new Promise(resolve=>{release=resolve;})});
  f.trigger();f.action.setRequest('other');release([product]);await tick();
  assert.equal(f.clicks,0);assert.equal(f.events,0);
  assert.equal(f.button.disabled,false);
});
test('account change during brand lookup cannot apply stale catalog product',async()=>{
  let releaseBrand;
  const f=fixture({getName:()=>new Promise(resolve=>{releaseBrand=resolve;})});
  f.trigger();await tick();f.action.setRequest('other');releaseBrand('Tienda');await tick();
  assert.equal(f.clicks,0);assert.equal(f.events,0);
});
test('dispose prevents stale replies and cannot be re-enabled by setRequest',async()=>{
  let release;
  const f=fixture({list:()=>new Promise(resolve=>{release=resolve;})});
  f.trigger();f.action.dispose();f.action.setRequest('other');release([product]);await tick();
  assert.equal(f.button.disabled,true);assert.equal(f.clicks,0);assert.equal(f.events,0);
});
test('incomplete editor controls reject before category click or partial changes',()=>{
  const draft=catalogEditorDraft(product,'Tienda');
  let clicks=0;
  const doc={getElementById:id=>id==='price'?null:{dispatchEvent(){}},
    querySelector:()=>({click(){clicks++;}})};
  assert.throws(()=>applyCatalogDraft({draft,doc,eventFactory:()=>({type:'input'})}),/DOM_UNAVAILABLE/);
  assert.equal(clicks,0);
});
