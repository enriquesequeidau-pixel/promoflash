/**
 * PromoFlash v2 — pure brand input and plan quota contract.
 * This module NEVER authorizes writes, reads entitlements, charges or stores data.
 * A trusted server must validate owner_uid, paid plan and quotas atomically.
 * The existing Free editor does not import this module.
 */
export const PLAN_LIMITS=Object.freeze({
  free:Object.freeze({brands:0,products:0,campaigns:0}),
  pro:Object.freeze({brands:1,products:50,campaigns:20}),
  business:Object.freeze({brands:5,products:250,campaigns:100})
});
export const BRAND_STYLES=Object.freeze(['soft','editorial','pop','bloom','neon','catalog','noir','citrus','market']);
const FIELDS=new Set(['name','primaryColor','secondaryColor','accentColor','phone','commercialUrl','style','logoAssetId']);
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HEX=/^#[a-f0-9]{6}$/i;
const UNSAFE=/[\u0000-\u001f\u007f-\u009f\u200e\u200f\u202a-\u202e\u2066-\u2069]/u;
function invalid(field,reason){const e=new TypeError(field+': '+reason);e.code='INVALID_BRAND';e.field=field;return e;}
function stringField(value,field,max,required=false){
  if(value===undefined||value===null||value===''){if(required)throw invalid(field,'obligatorio');return '';}
  if(typeof value!=='string')throw invalid(field,'debe ser texto');
  const v=value.trim().normalize('NFC');
  if((required&&!v)||[...v].length>max||UNSAFE.test(v))throw invalid(field,'longitud o caracteres no permitidos');
  return v;
}
function color(value,field,fallback){
  if(value===undefined||value===null||value==='')return fallback;
  if(typeof value!=='string'||!HEX.test(value))throw invalid(field,'usar #RRGGBB');
  return value.toUpperCase();
}
function commercialUrl(value){
  const raw=stringField(value,'commercialUrl',500);
  if(!raw)return '';
  let parsed;
  try{parsed=new URL(raw);}catch{throw invalid('commercialUrl','URL no válida');}
  if(parsed.protocol!=='https:'||!parsed.hostname||parsed.username||parsed.password)
    throw invalid('commercialUrl','HTTPS sin credenciales requerido');
  return parsed.href;
}
export function normalizeBrandDraft(input){
  if(!input||typeof input!=='object'||Array.isArray(input)||
     (Object.getPrototypeOf(input)!==Object.prototype&&Object.getPrototypeOf(input)!==null))
    throw invalid('brand','objeto plano requerido');
  for(const key of Object.keys(input))if(!FIELDS.has(key))throw invalid(key,'campo no permitido');
  const name=stringField(input.name,'name',60,true);
  const phone=stringField(input.phone,'phone',30);
  if(phone&&!/^[+0-9() .-]{5,30}$/.test(phone))throw invalid('phone','formato inválido');
  const style=input.style===undefined?'catalog':stringField(input.style,'style',20,true);
  if(!BRAND_STYLES.includes(style))throw invalid('style','estilo desconocido');
  const logoAssetId=stringField(input.logoAssetId,'logoAssetId',36);
  if(logoAssetId&&!UUID.test(logoAssetId))throw invalid('logoAssetId','UUID inválido');
  // The server must verify private logo ownership before storing or delivering it.
  return Object.freeze({
    name,
    primaryColor:color(input.primaryColor,'primaryColor','#232841'),
    secondaryColor:color(input.secondaryColor,'secondaryColor','#FFFFFF'),
    accentColor:color(input.accentColor,'accentColor','#596BDB'),
    phone,commercialUrl:commercialUrl(input.commercialUrl),style,
    logoAssetId:logoAssetId||null
  });
}
/**
 * UI-only quota preview: counts are simultaneously stored records, not monthly
 * usage or download limits. Server must enforce these under concurrency.
 */
export function quotaSnapshot(plan,resource,count){
  if(!Object.prototype.hasOwnProperty.call(PLAN_LIMITS,plan))throw new RangeError('Plan desconocido');
  if(!['brands','products','campaigns'].includes(resource))throw new RangeError('Recurso desconocido');
  if(!Number.isSafeInteger(count)||count<0)throw new RangeError('Conteo inválido');
  const limit=PLAN_LIMITS[plan][resource];
  return Object.freeze({allowed:count<limit,limit,remaining:Math.max(0,limit-count)});
}
