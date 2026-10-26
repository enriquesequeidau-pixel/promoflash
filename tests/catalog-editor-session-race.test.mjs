import test from 'node:test';
import assert from 'node:assert/strict';
import {createCatalogEditorHttpClient} from '../v2/catalog-editor-http-client.mjs';
import {attachCatalogEditorButton} from '../v2/catalog-editor-bridge.mjs';

const BRAND='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const product={id:'item-one',brandId:BRAND,name:'Producto de prueba',description:'',category:'food',priceCentavos:1200,currency:'MXN',photoAssetId:null};
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function deferred(){let resolve;const promise=new Promise(r=>{resolve=r});return {promise,resolve};}
function editor(client){
 let clickHandler;const values={productName:'FREE',price:'FREE',brand:'FREE'};let edits=0;
 const doc={getElementById:id=>({set value(v){values[id]=v},get value(){return values[id]},dispatchEvent(){edits++}}),querySelector:()=>({click(){edits++}})};
 const button={disabled:false,addEventListener(_,fn){clickHandler=fn},removeEventListener(){clickHandler=null}};
 const errors=[];
 const action=attachCatalogEditorButton({button,select:{value:'item-one'},request:'owner-one-token',doc,
  ...client,eventFactory:()=>({type:'input'}),onError:e=>errors.push(e.code||e.message)});
 return {action,button,values,errors,get edits(){return edits},click(){clickHandler?.()}};
}
test('logout while product HTTP request is pending cannot mutate Free controls',async()=>{
 const pending=deferred();let requested=0;
 const client=createCatalogEditorHttpClient({fetcher:async()=>{requested++;return pending.promise}});
 const ui=editor(client);
 ui.click();await tick();assert.equal(requested,1);
 ui.action.setRequest(null);
 pending.resolve({status:200,json:async()=>({products:[product]})});
 await tick();await tick();
 assert.deepEqual(ui.values,{productName:'FREE',price:'FREE',brand:'FREE'});
 assert.equal(ui.edits,0);assert.deepEqual(ui.errors,[]);
 assert.equal(ui.button.disabled,false);
});
test('dispose during pending product request suppresses mutations and errors',async()=>{
 const pending=deferred();
 const client=createCatalogEditorHttpClient({fetcher:()=>pending.promise});
 const ui=editor(client);
 ui.click();await tick();ui.action.dispose();
 pending.resolve({status:401,json:async()=>({})});
 await tick();await tick();
 assert.equal(ui.edits,0);assert.deepEqual(ui.errors,[]);
 assert.equal(ui.button.disabled,true);
});
