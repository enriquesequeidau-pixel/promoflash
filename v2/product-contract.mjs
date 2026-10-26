/**
 * PromoFlash v2 — pure catalog product validation.
 * No storage, billing, entitlement, network or browser side effects.
 * Only the backend can prove brand ownership and enforce aggregate quotas.
 * The existing Free editor does not import this module.
 */
export const PRODUCT_CATEGORIES=Object.freeze(['beauty','fashion','jewelry','food','home']);
export const MAX_PRICE_CENTAVOS=100_000_000; // MXN 1,000,000.00 per item
const ALLOWED=new Set(['brandId','name','description','category','priceCentavos','photoAssetId']);
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const UNSAFE=/[\u0000-\u0008\u000b-\u001f\u007f-\u009f\u200e\u200f\u202a-\u202e\u2066-\u2069\ud800-\udfff]/u;
function invalid(field,reason){const error=new TypeError(field+': '+reason);error.code='INVALID_PRODUCT';error.field=field;return error;}
function textField(value,field,max,required=false,multiline=false){
  if(value===undefined||value===null||value===''){if(required)throw invalid(field,'obligatorio');return '';}
  if(typeof value!=='string')throw invalid(field,'texto requerido');
  const normalized=value.trim().normalize('NFC');
  if((required&&!normalized)||[...normalized].length>max||UNSAFE.test(normalized)||
     (!multiline&&/[\r\n]/.test(normalized))||/\r/.test(normalized))
    throw invalid(field,'longitud o caracteres no permitidos');
  return normalized;
}
function uuidField(value,field,required=false){
  if((value===undefined||value===null||value==='')&&!required)return null;
  if(typeof value!=='string'||!UUID.test(value))throw invalid(field,'UUID requerido');
  return value.toLowerCase();
}
/**
 * Prices are integer centavos, not floats, to avoid rounding ambiguities.
 * Never accept owner, plan, status, permissions, or a client-supplied currency.
 */
export function normalizeProductDraft(input){
  if(!input||typeof input!=='object'||Array.isArray(input)||
     (Object.getPrototypeOf(input)!==Object.prototype&&Object.getPrototypeOf(input)!==null))
    throw invalid('product','objeto plano requerido');
  for(const [key,descriptor] of Object.entries(Object.getOwnPropertyDescriptors(input))){
    if(!ALLOWED.has(key))throw invalid(key,'campo no permitido');
    if(!Object.prototype.hasOwnProperty.call(descriptor,'value'))throw invalid(key,'accesor no permitido');
  }
  const brandId=uuidField(input.brandId,'brandId',true);
  const name=textField(input.name,'name',80,true);
  const description=textField(input.description,'description',500,false,true);
  const category=textField(input.category,'category',20,true);
  if(!PRODUCT_CATEGORIES.includes(category))throw invalid('category','rubro desconocido');
  const priceCentavos=input.priceCentavos;
  if(!Number.isSafeInteger(priceCentavos)||priceCentavos<0||priceCentavos>MAX_PRICE_CENTAVOS)
    throw invalid('priceCentavos','importe entero MXN en centavos fuera de rango');
  const photoAssetId=uuidField(input.photoAssetId,'photoAssetId');
  // This is syntactic validation only. Server must check owner of brand and private photo.
  return Object.freeze({brandId,name,description,category,priceCentavos,currency:'MXN',photoAssetId});
}
/** Display only; never use a formatted string as the persisted amount. */
export function formatProductPriceMXN(priceCentavos){
  if(!Number.isSafeInteger(priceCentavos)||priceCentavos<0||priceCentavos>MAX_PRICE_CENTAVOS)
    throw invalid('priceCentavos','importe inválido');
  return new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN',minimumFractionDigits:2,maximumFractionDigits:2}).format(priceCentavos/100);
}
