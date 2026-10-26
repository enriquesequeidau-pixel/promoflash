import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeBrandDraft,quotaSnapshot,PLAN_LIMITS,BRAND_STYLES} from '../v2/brand-contract.mjs';

test('Free, Pro and Business quotas are simultaneous record counts',()=>{
  assert.deepEqual(PLAN_LIMITS.pro,{brands:1,products:50,campaigns:20});
  assert.deepEqual(PLAN_LIMITS.business,{brands:5,products:250,campaigns:100});
  assert.equal(quotaSnapshot('free','brands',0).allowed,false);
  assert.deepEqual(quotaSnapshot('pro','brands',0),{allowed:true,limit:1,remaining:1});
  assert.deepEqual(quotaSnapshot('pro','brands',1),{allowed:false,limit:1,remaining:0});
  assert.equal(quotaSnapshot('pro','products',49).allowed,true);
  assert.equal(quotaSnapshot('pro','products',50).allowed,false);
  assert.equal(quotaSnapshot('pro','campaigns',20).allowed,false);
  assert.equal(quotaSnapshot('business','brands',4).allowed,true);
  assert.equal(quotaSnapshot('business','brands',5).allowed,false);
  assert.equal(quotaSnapshot('business','products',250).allowed,false);
  assert.equal(quotaSnapshot('business','campaigns',100).allowed,false);
});
test('unknown plans, resources and bad counts fail closed',()=>{
  for(const args of [['enterprise','brands',0],['__proto__','brands',0],
    ['pro','downloads',0],['pro','brands',-1],['pro','brands',1.5],
    ['pro','brands',NaN],['business','campaigns',Number.MAX_SAFE_INTEGER+1]])
    assert.throws(()=>quotaSnapshot(...args),RangeError);
});
test('brand input is normalized and does not include privileged fields',()=>{
  const b=normalizeBrandDraft({name:'  Tienda Ñandú  ',primaryColor:'#aabbcc',
    commercialUrl:'https://ejemplo.mx/tienda',style:'noir'});
  assert.equal(b.name,'Tienda Ñandú');
  assert.equal(b.primaryColor,'#AABBCC');
  assert.equal(b.secondaryColor,'#FFFFFF');
  assert.equal(b.accentColor,'#596BDB');
  assert.equal(b.commercialUrl,'https://ejemplo.mx/tienda');
  assert.equal(b.style,'noir');
  assert.equal(b.logoAssetId,null);
  assert.equal(Object.isFrozen(b),true);
  assert.equal(BRAND_STYLES.length,9);
  assert.equal('owner_uid' in b,false);
  assert.equal('plan' in b,false);
});
test('rejects forged ownership, billing fields and hostile input',()=>{
  for(const bad of [null,[],'Tienda',{name:''},{name:'   '},{name:'x'.repeat(61)},
    {name:'A\nB'},{name:'A\u202eB'},{name:'Tienda',owner_uid:'victim'},
    {name:'Tienda',plan:'business'},{name:'Tienda',logoUrl:'https://public.example/logo.png'},
    {name:'Tienda',primaryColor:'red'},{name:'Tienda',primaryColor:'#FFF'},
    {name:'Tienda',style:'script'},{name:'Tienda',phone:'555<script>'},
    {name:'Tienda',commercialUrl:'javascript:alert(1)'},
    {name:'Tienda',commercialUrl:'http://ejemplo.mx'},
    {name:'Tienda',commercialUrl:'https://user:pass@ejemplo.mx'},
    {name:'Tienda',logoAssetId:'../secret'}])
    assert.throws(()=>normalizeBrandDraft(bad),{code:'INVALID_BRAND'});
});
test('optional phone and private logo UUID pass syntax validation only',()=>{
  const b=normalizeBrandDraft({name:'Comercio Local',phone:'+52 (55) 1234-5678',
    logoAssetId:'11111111-1111-4111-8111-111111111111'});
  assert.equal(b.phone,'+52 (55) 1234-5678');
  assert.equal(b.logoAssetId,'11111111-1111-4111-8111-111111111111');
});
