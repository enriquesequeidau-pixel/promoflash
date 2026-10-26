/** PromoFlash Pro editor: pure text/DOM adapter. Never grants subscription. */
const LIMITS={headline:42,subtitle:70,cta:29};
export function normalizeProStudioResponse(payload){
  if(!payload||typeof payload!=="object"||Array.isArray(payload))throw new Error("RESPUESTA_PRO_INVALIDA");
  if(payload.brand_saved!==true||!Array.isArray(payload.headlines)||payload.headlines.length!==3)throw new Error("RESPUESTA_PRO_INVALIDA");
  const clean=(value,max)=> {
    if(typeof value!=="string"||!value.trim()||value.length>max||
       /[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/u.test(value))
      throw new Error("RESPUESTA_PRO_INVALIDA");
    return value.trim();
  };
  const headlines=payload.headlines.map(x=>clean(x,250));
  const ctas=Array.isArray(payload.cta)&&payload.cta.length===3
    ?payload.cta.map(x=>clean(x,100)):["Ver producto","Pedir ahora","Escríbenos hoy"];
  return Object.freeze(headlines.map((full,i)=>Object.freeze({
    full,headline:full.slice(0,LIMITS.headline),cta:ctas[i].slice(0,LIMITS.cta)
  })));
}
export function applyProHeadline(doc,item){
  if(!item||typeof item.headline!=="string"||typeof item.cta!=="string"||
     item.headline.length>LIMITS.headline||item.cta.length>LIMITS.cta)
    throw new TypeError("TEXTO_PRO_INVALIDO");
  const h=doc?.getElementById?.("headline"),cta=doc?.getElementById?.("cta");
  if(!h||!cta||typeof h.dispatchEvent!=="function"||typeof cta.dispatchEvent!=="function")
    throw new TypeError("EDITOR_NO_DISPONIBLE");
  h.value=item.headline;cta.value=item.cta;
  h.dispatchEvent(new Event("input",{bubbles:true}));
  cta.dispatchEvent(new Event("input",{bubbles:true}));
}
