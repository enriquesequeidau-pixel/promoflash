import test from 'node:test';
import assert from 'node:assert/strict';
import {tabScopedAuthStorage} from '../auth-storage.mjs';
const key='sequeidaulabs-promoflash-auth-v1';
function store(){
 const map=new Map();
 return {getItem:k=>map.has(k)?map.get(k):null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k)};
}
function setup(){globalThis.window={sessionStorage:store(),localStorage:store()};return window;}
const valid=JSON.stringify({access_token:'fake-auth-access',refresh_token:'fake-auth-refresh',user:{id:'test-id'}});
test('moves valid existing PromoFlash session into tab-only storage without logout',()=>{
 const w=setup();w.localStorage.setItem(key,valid);
 assert.equal(tabScopedAuthStorage(key),w.sessionStorage);
 assert.equal(w.sessionStorage.getItem(key),valid);
 assert.equal(w.localStorage.getItem(key),null);
});
test('cleans stale invalid session, while preserving another MicroApp key',()=>{
 const w=setup();w.localStorage.setItem(key,'not valid json');
 w.localStorage.setItem('sequeidaulabs-misterioya-auth-v1',valid);
 tabScopedAuthStorage(key);
 assert.equal(w.localStorage.getItem(key),null);
 assert.equal(w.localStorage.getItem('sequeidaulabs-misterioya-auth-v1'),valid);
 assert.equal(w.sessionStorage.getItem('sequeidaulabs-misterioya-auth-v1'),null);
});
test('does not erase a valid login when sessionStorage is unavailable',()=>{
 const w=setup();w.localStorage.setItem(key,valid);
 w.sessionStorage.setItem=()=>{throw Error('Storage quota exceeded');};
 assert.equal(tabScopedAuthStorage(key),w.sessionStorage);
 assert.equal(w.localStorage.getItem(key),valid);
});
test('refuses empty, forged, and cross-purpose storage keys',()=>{
 setup();
 for(const name of ['', '../other', 'a', 'HACKER_KEY'])assert.throws(()=>tabScopedAuthStorage(name));
});
