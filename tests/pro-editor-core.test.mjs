import test from "node:test";
import assert from "node:assert/strict";
import {normalizeProStudioResponse,applyProHeadline} from "../v2/pro-editor-core.mjs";
const data={brand_saved:true,headlines:["Mi tienda tiene una gran oferta", "Otro titular", "Tercero"],cta:["Ver producto","Pedir ahora","Escríbenos hoy"]};
test("acepta solo respuesta validada del servidor",()=>{
 const x=normalizeProStudioResponse(data);
 assert.equal(x.length,3);assert.equal(x[0].headline,"Mi tienda tiene una gran oferta");
 assert.equal(x[1].cta,"Pedir ahora");assert.ok(Object.isFrozen(x));
});
test("rechaza payload incorrecto o supuesta autorización cliente",()=>{
 for(const p of [null,{}, {headlines:data.headlines,brand_saved:false},
  {...data,headlines:["uno"]},{...data,headlines:["uno","dos","tres\n<script>"]}])
  assert.throws(()=>normalizeProStudioResponse(p));
});
test("no sobrepasa maxlength del editor",()=>{
 const x=normalizeProStudioResponse({...data,headlines:["X".repeat(80),"otro","tres"]});
 assert.equal(x[0].headline.length,42);
});
test("aplica titular y CTA usando input events",()=>{
 const events=[];const h={value:"",dispatchEvent:()=>events.push("headline")};
 const c={value:"",dispatchEvent:()=>events.push("cta")};
 const oldEvent=globalThis.Event;
 globalThis.Event=class{constructor(type){this.type=type;}};
 try{
  applyProHeadline({getElementById:id=>id==="headline"?h:id==="cta"?c:null},{headline:"Promo especial",cta:"Comprar"});
  assert.equal(h.value,"Promo especial");assert.equal(c.value,"Comprar");assert.deepEqual(events,["headline","cta"]);
 }finally{globalThis.Event=oldEvent;}
});
