/**
 * PromoFlash v2: opt-in JSON export of the authenticated user's catalog.
 * SANDBOX ONLY until a real, owner-scoped backend adapter is available.
 * Never used by the anonymous Free editor. No network, storage or payments.
 */
const FIELDS = new Set(['id','brandId','name','description','category','priceCentavos','currency','photoAssetId']);
const CATEGORIES = new Set(['beauty','fashion','jewelry','food','home']);
const ID = /^[a-zA-Z0-9_-]{1,80}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const UNSAFE = /[\u0000-\u001f\u007f-\u009f\u200e\u200f\u202a-\u202e\u2066-\u2069\ud800-\udfff]/u;
function invalid(){ throw new TypeError('CATALOG_EXPORT_INVALID'); }
function cleanString(value, max, multiline=false){
  if(typeof value!=='string' || [...value].length>max || UNSAFE.test(value) || (!multiline && /[\r\n]/.test(value))) invalid();
  return value;
}
function safeRecord(value){
  if(!value || typeof value!=='object' || Array.isArray(value) ||
    ![Object.prototype,null].includes(Object.getPrototypeOf(value))) invalid();
  const descriptors=Object.getOwnPropertyDescriptors(value);
  for(const [key,d] of Object.entries(descriptors)){
    if(!FIELDS.has(key) || !Object.hasOwn(d,'value')) invalid();
  }
  if(typeof value.id!=='string'||!ID.test(value.id)) invalid();
  if(typeof value.brandId!=='string'||!UUID.test(value.brandId)) invalid();
  if(value.currency!=='MXN'||!CATEGORIES.has(value.category)) invalid();
  if(!Number.isSafeInteger(value.priceCentavos)||value.priceCentavos<0||value.priceCentavos>100_000_000) invalid();
  if(value.photoAssetId!==null && value.photoAssetId!==undefined &&
    (typeof value.photoAssetId!=='string'||!UUID.test(value.photoAssetId))) invalid();
  const name=cleanString(value.name,80);
  if(!name.trim()) invalid();
  return {
    id:value.id,brandId:value.brandId,name,
    description:cleanString(value.description??'',500,true),
    category:value.category,priceCentavos:value.priceCentavos,
    currency:'MXN',photoAssetId:value.photoAssetId??null
  };
}
/** list() MUST authenticate the request and enforce owner scoping server-side. */
export async function buildCatalogExport({catalog,request,now=()=>new Date()}={}){
  if(typeof catalog?.list!=='function'||typeof now!=='function') throw new TypeError('Trusted catalog adapter required');
  const raw=await catalog.list(request);
  if(!Array.isArray(raw)||raw.length>250) invalid();
  const products=raw.map(safeRecord).sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);
  if(new Set(products.map(p=>p.id)).size!==products.length) invalid();
  const date=now();
  if(!(date instanceof Date)||!Number.isFinite(date.getTime())) invalid();
  const json=JSON.stringify({format:'promoflash-catalog-v2',exportedAt:date.toISOString(),
    note:'Solo metadatos. Las fotos privadas no se incluyen.',products},null,2)+'\n';
  if(new TextEncoder().encode(json).length>512_000) invalid();
  return json;
}
/** Explicit click only; rejects stale responses on logout or account switch. */
export function attachCatalogExportButton({button,catalog,request,document:doc,urlApi=URL,now,setTimer=setTimeout}={}){
  if(!button?.addEventListener||!button?.removeEventListener||!doc?.createElement||
    !urlApi?.createObjectURL||!urlApi?.revokeObjectURL||typeof setTimer!=='function')
    throw new TypeError('DOM download dependencies required');
  let generation=0,active=true,busy=false,credential=request;
  async function click(){
    if(!active||busy)return;
    const current=++generation;
    busy=true;button.disabled=true;
    try{
      const json=await buildCatalogExport({catalog,request:credential,now});
      if(!active||generation!==current)return;
      const href=urlApi.createObjectURL(new Blob([json],{type:'application/json;charset=utf-8'}));
      try{
        const link=doc.createElement('a');
        link.href=href;link.download='promoflash-catalogo-v2.json';
        link.click();
      }finally{setTimer(()=>urlApi.revokeObjectURL(href),10000);}
    }finally{
      if(active&&generation===current){busy=false;button.disabled=false;}
    }
  }
  const handler=()=>{void click().catch(()=>{ /* no download on auth/network failure */ });};
  button.addEventListener('click',handler);
  return Object.freeze({
    setRequest(next){generation++;credential=next;busy=false;button.disabled=false;},
    dispose(){generation++;active=false;credential=null;button.removeEventListener('click',handler);button.disabled=true;}
  });
}
