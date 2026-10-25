/**
 * PromoFlash v2 — SERVER-ONLY Supabase REST adapter (not deployed).
 *
 * Binds the catalog HTTP handler to verified Supabase Auth and the staged,
 * transaction-safe PostgreSQL RPC. There are NO embedded keys or production
 * requests; provide an explicit trusted fetch implementation from the server.
 *
 * Never import from editor.js, HTML or browser bundles. Not ready for Live:
 * the SQL migrations, paid entitlement reconciliation, origin configuration,
 * rate limits and full staging E2E must all be reviewed first.
 */
import {normalizeProductDraft} from './product-contract.mjs';

const REF_URL=/^https:\/\/[a-z0-9]{20}\.supabase\.co$/;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const FIELDS='id,owner_uid,brand_id,name,description,category,price_centavos,currency,photo_asset_id';
function error(code){
  const value=new Error(code);
  value.code=code;
  return value;
}
async function jsonOrFail(response){
  try{return await response.json();}
  catch{throw error('CATALOG_UNAVAILABLE');}
}
function productFromDb(row,uid){
  if(!row||typeof row!=='object'||Array.isArray(row)||
      row.owner_uid!==uid||typeof row.id!=='string'||!UUID.test(row.id))
    throw error('CATALOG_UNAVAILABLE');
  let normalized;
  try{
    normalized=normalizeProductDraft({
      brandId:row.brand_id,name:row.name,description:row.description,
      category:row.category,priceCentavos:row.price_centavos,
      photoAssetId:row.photo_asset_id
    });
  }catch{throw error('CATALOG_UNAVAILABLE');}
  if(row.currency!=='MXN')throw error('CATALOG_UNAVAILABLE');
  return Object.freeze({id:row.id,ownerUid:uid,...normalized});
}
function rpcError(body){
  if(body?.code==='23503')return error('BRAND_NOT_FOUND');
  if(['23514','22023','22P02'].includes(body?.code))return error('INVALID_PRODUCT');
  if(body?.code==='P0001'){
    const message=body?.message;
    if(message==='PRODUCT_QUOTA'||message==='PLAN_REQUIRED')return error(message);
    if(message==='PHOTO_NOT_READY')return error('INVALID_PRODUCT');
  }
  return error('CATALOG_UNAVAILABLE');
}
export function createSupabaseCatalogStore({projectUrl,publishableKey,serviceRoleKey,
  fetcher}={}){
  if(typeof projectUrl!=='string'||!REF_URL.test(projectUrl)||
      typeof publishableKey!=='string'||publishableKey.length<20||
      typeof serviceRoleKey!=='string'||serviceRoleKey.length<20||
      publishableKey===serviceRoleKey||typeof fetcher!=='function')
    throw new TypeError('Server-side Supabase adapter configuration required');
  const serviceHeaders=Object.freeze({
    apikey:serviceRoleKey,Authorization:'Bearer '+serviceRoleKey
  });
  const userHeaders=Object.freeze({apikey:publishableKey});

  /** Auth server checks expiry/signature/session. Never just decode a JWT. */
  async function authenticateBearer(token){
    if(typeof token!=='string'||token.length<8||token.length>4096)return null;
    let result;
    try{
      result=await fetcher(projectUrl+'/auth/v1/user',{
        method:'GET',headers:{...userHeaders,Authorization:'Bearer '+token},
        cache:'no-store',redirect:'error'
      });
    }catch{throw error('CATALOG_UNAVAILABLE');}
    if(result?.status===401||result?.status===403)return null;
    if(result?.status!==200)throw error('CATALOG_UNAVAILABLE');
    const user=await jsonOrFail(result);
    if(!UUID.test(user?.id??''))return null;
    return Object.freeze({uid:user.id});
  }

  async function readOne(uid,id){
    const url=projectUrl+'/rest/v1/pf_v2_products?select='+FIELDS+
      '&owner_uid=eq.'+uid+'&id=eq.'+id+'&limit=1';
    const res=await fetcher(url,{method:'GET',headers:serviceHeaders,
      cache:'no-store',redirect:'error'});
    if(res?.status!==200)throw error('CATALOG_UNAVAILABLE');
    const rows=await jsonOrFail(res);
    if(!Array.isArray(rows)||rows.length!==1)throw error('CATALOG_UNAVAILABLE');
    return productFromDb(rows[0],uid);
  }

  /** Privileged read still applies explicit owner filtering + response checks. */
  async function listProducts(uid){
    if(!UUID.test(uid??''))throw error('UNAUTHENTICATED');
    const url=projectUrl+'/rest/v1/pf_v2_products?select='+FIELDS+
      '&owner_uid=eq.'+uid+'&order=created_at.desc&limit=250';
    const res=await fetcher(url,{method:'GET',headers:serviceHeaders,
      cache:'no-store',redirect:'error'});
    if(res?.status!==200)throw error('CATALOG_UNAVAILABLE');
    const rows=await jsonOrFail(res);
    if(!Array.isArray(rows)||rows.length>250)throw error('CATALOG_UNAVAILABLE');
    return rows.map(row=>productFromDb(row,uid));
  }

  /** Database RPC atomically rechecks the verified plan, owner and quota. */
  async function createProduct(uid,input){
    if(!UUID.test(uid??''))throw error('UNAUTHENTICATED');
    let product;
    try{
      let draft=input;
      // The trusted HTTP adapter passes the normalized currency:'MXN'.
      // Only this exact derived constant is tolerated; all other fields
      // are still checked by normalizeProductDraft.
      if(input&&typeof input==='object'&&!Array.isArray(input)&&
          Object.hasOwn(input,'currency')){
        if(![Object.prototype,null].includes(Object.getPrototypeOf(input)))
          throw error('INVALID_PRODUCT');
        const descriptors=Object.getOwnPropertyDescriptors(input);
        if(Object.values(descriptors).some(d=>!Object.hasOwn(d,'value'))||
            descriptors.currency.value!=='MXN')throw error('INVALID_PRODUCT');
        const {currency,...remaining}=input;
        draft=remaining;
      }
      product=normalizeProductDraft(draft);
    }catch{throw error('INVALID_PRODUCT');}
    // Photo references require a separate verified owner-scoped Storage adapter.
    if(product.photoAssetId)throw error('INVALID_PRODUCT');
    const payload={
      p_owner_uid:uid,p_brand_id:product.brandId,p_name:product.name,
      p_category:product.category,p_price_centavos:product.priceCentavos,
      p_description:product.description,p_photo_asset_id:null
    };
    const res=await fetcher(projectUrl+'/rest/v1/rpc/pf_v2_create_product_trusted',{
      method:'POST',headers:{...serviceHeaders,'Content-Type':'application/json'},
      body:JSON.stringify(payload),cache:'no-store',redirect:'error'
    });
    if(res?.status!==200)throw rpcError(await jsonOrFail(res));
    const id=await jsonOrFail(res);
    if(typeof id!=='string'||!UUID.test(id))throw error('CATALOG_UNAVAILABLE');
    return readOne(uid,id);
  }

  return Object.freeze({authenticateBearer,listProducts,createProduct});
}
