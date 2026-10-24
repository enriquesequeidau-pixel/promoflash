const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');

function fixture(){
 const nodes=new Map();
 function element(id){
  if(!nodes.has(id)){
   const classes=new Set(['hidden']);
   nodes.set(id,{textContent:'',value:'',disabled:false,handlers:{},
    classList:{add:k=>classes.add(k),remove:k=>classes.delete(k),
     contains:k=>classes.has(k),toggle:(k,on)=>on?classes.add(k):classes.delete(k)},
    addEventListener(name,fn){this.handlers[name]=fn},
    replaceChildren(){this.textContent=''}});
  }
  return nodes.get(id);
 }
 let user={id:'user-a',email:'a@example.test'};
 let entitlement=async()=>({data:{active:true},error:null});
 const client={auth:{
  getUser:async()=>({data:{user},error:null}),
  getSession:async()=>({data:{session:null}}),
  signOut:async()=>{user=null;return{}},
  onAuthStateChange:()=>{}
 },from:()=>({select:()=>({eq:()=>({maybeSingle:()=>entitlement()})})})};
 const source=readFileSync('cuenta.js','utf8').replace(/^import[^\n]*\n/gm,'');
 const run=new Function('document','window','location','createAuthCaptcha','tabScopedAuthStorage','createClient','queueMicrotask','fetch',source+'\nreturn {render};');
 const api=run({getElementById:element},{PROMOFLASH_CONFIG:{supabaseUrl:'https://example.test',supabaseAnonKey:'public',proPaymentsEnabled:false}},
  {href:'https://example.test/cuenta.html'},()=>({activate(){},reset(){},requiredToken(){return null}}),
  ()=>({}),()=>client,queueMicrotask,()=>{throw Error('No network expected')});
 return {element,api,setUser:value=>{user=value},setEntitlement:fn=>{entitlement=fn}};
}

test('logout clears Pro output and prevents stale entitlement from reopening tools',async()=>{
 const f=fixture();
 await f.api.render();
 assert.equal(f.element('proTools').classList.contains('hidden'),false);
 f.element('proOutput').textContent='private draft';
 await f.element('signOut').handlers.click();
 assert.equal(f.element('proTools').classList.contains('hidden'),true);
 assert.equal(f.element('proOutput').textContent,'');
 f.setUser({id:'user-b',email:'b@example.test'});
 let resolve;
 f.setEntitlement(()=>new Promise(done=>{resolve=done}));
 const pending=f.api.render();
 await Promise.resolve();await Promise.resolve();
 assert.equal(typeof resolve,'function');
 await f.element('signOut').handlers.click();
 resolve({data:{active:true},error:null});
 await pending;
 assert.equal(f.element('proTools').classList.contains('hidden'),true);
});

test('failed or revoked entitlement hides previously visible Pro tools',async()=>{
 const f=fixture();
 await f.api.render();
 assert.equal(f.element('proTools').classList.contains('hidden'),false);
 f.element('proOutput').textContent='old output';
 f.setEntitlement(async()=>({data:null,error:{message:'network'}}));
 await f.api.render();
 assert.equal(f.element('proTools').classList.contains('hidden'),true);
 assert.equal(f.element('proOutput').textContent,'');
 f.setEntitlement(async()=>({data:{active:false},error:null}));
 await f.api.render();
 assert.equal(f.element('proTools').classList.contains('hidden'),true);
});
