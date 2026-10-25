/**
 * PromoFlash v2 — opt-in, browser-only bridge from an authenticated catalog
 * to the existing Free editor. NOT wired to production or anonymous Free UI.
 * catalog.list() and brands.getName() MUST enforce owner scoping server-side.
 * This bridge never makes network calls, stores credentials or grants a plan.
 */
import {normalizeProductDraft} from './product-contract.mjs';

const ID=/^[a-zA-Z0-9_-]{1,80}$/;
const ALLOWED=new Set(['id','brandId','name','description','category','priceCentavos','currency','photoAssetId']);
function invalid(code){throw new TypeError('CATALOG_EDITOR_'+code);}
function plain(value){
  return value!==null&&typeof value==='object'&&!Array.isArray(value)&&
    [Object.prototype,null].includes(Object.getPrototypeOf(value));
}

/** Validate the stored product before touching any editor control. */
export function catalogEditorDraft(product,brandName){
  if(!plain(product))invalid('INVALID_PRODUCT');
  for(const [key,descriptor] of Object.entries(Object.getOwnPropertyDescriptors(product))){
    if(!ALLOWED.has(key)||!Object.hasOwn(descriptor,'value'))invalid('INVALID_PRODUCT');
  }
  if(typeof product.id!=='string'||!ID.test(product.id)||product.currency!=='MXN')
    invalid('INVALID_PRODUCT');
  const normalized=normalizeProductDraft({
    brandId:product.brandId,name:product.name,description:product.description,
    category:product.category,priceCentavos:product.priceCentavos,
    photoAssetId:product.photoAssetId
  });
  // HTML maxlength uses UTF-16 code units, not Unicode code points.
  if(normalized.name.length>46)invalid('NAME_TOO_LONG');
  if(typeof brandName!=='string'||!brandName.trim()||brandName.trim().length>28||
    /[\u0000-\u001f\u007f-\u009f\u200e\u200f\u202a-\u202e\u2066-\u2069]/u.test(brandName))
    invalid('BRAND_INVALID');
  const price='$'+new Intl.NumberFormat('es-MX',{minimumFractionDigits:2,
    maximumFractionDigits:2}).format(normalized.priceCentavos/100)+' MXN';
  if(price.length>18)invalid('PRICE_TOO_LONG');
  return Object.freeze({category:normalized.category,productName:normalized.name,
    price,brand:brandName.trim()});
}

/**
 * The user explicitly chooses a product; do not overwrite Free fields on load.
 * Category click uses the existing editor handler, then inputs refresh preview.
 */
export function applyCatalogDraft({draft,doc,eventFactory=()=>new Event('input',{bubbles:true})}={}){
  if(!draft||!['beauty','fashion','jewelry','food','home'].includes(draft.category)||
    typeof eventFactory!=='function'||typeof doc?.getElementById!=='function'||
    typeof doc?.querySelector!=='function')invalid('DOM_UNAVAILABLE');
  const category=doc.querySelector('.category[data-category="'+draft.category+'"]');
  const controls=['productName','price','brand'].map(id=>doc.getElementById(id));
  if(!category||typeof category.click!=='function'||controls.some(el=>
    !el||typeof el.dispatchEvent!=='function'))invalid('DOM_UNAVAILABLE');
  // Do not apply an unchecked draft supplied directly by a page or query string.
  if(typeof draft.productName!=='string'||draft.productName.length>46||
    typeof draft.price!=='string'||draft.price.length>18||
    !/^\$[0-9,.]+ MXN$/.test(draft.price)||typeof draft.brand!=='string'||
    !draft.brand||draft.brand.length>28)invalid('INVALID_DRAFT');
  category.click();
  [draft.productName,draft.price,draft.brand].forEach((value,i)=>{
    controls[i].value=value;
    controls[i].dispatchEvent(eventFactory());
  });
  return true;
}

/** Explicit click, fail closed on missing owner-scoped catalog or stale account. */
export function attachCatalogEditorButton({button,select,catalog,brands,request,doc,
  eventFactory,onError=()=>{}}={}){
  if(typeof button?.addEventListener!=='function'||typeof button?.removeEventListener!=='function'||
    !select||typeof catalog?.list!=='function'||typeof brands?.getName!=='function'||
    typeof onError!=='function')invalid('DEPENDENCIES');
  let active=true,busy=false,generation=0,credential=request;
  async function click(){
    if(!active||busy)return;
    const current=++generation,selected=select.value,identity=credential;
    busy=true;button.disabled=true;
    try{
      if(typeof selected!=='string'||!ID.test(selected))invalid('SELECTION');
      const products=await catalog.list(identity);
      if(!active||current!==generation)return;
      if(!Array.isArray(products))invalid('LIST');
      const matching=products.filter(p=>p?.id===selected);
      if(matching.length!==1)invalid('SELECTION');
      const product=matching[0];
      const brandName=await brands.getName(identity,product.brandId);
      if(!active||current!==generation)return;
      const draft=catalogEditorDraft(product,brandName);
      applyCatalogDraft({draft,doc,eventFactory});
    }catch(error){
      if(active&&current===generation)onError(error);
    }finally{
      if(active&&current===generation){busy=false;button.disabled=false;}
    }
  }
  const handler=()=>{void click();};
  button.addEventListener('click',handler);
  return Object.freeze({
    setRequest(next){if(!active)return;generation++;credential=next;busy=false;button.disabled=false;},
    dispose(){generation++;active=false;credential=null;button.removeEventListener('click',handler);button.disabled=true;}
  });
}
