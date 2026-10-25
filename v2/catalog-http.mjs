/**
 * PromoFlash v2 — Node HTTP adapter for isolated tests; NOT deployed.
 *
 * No Supabase credentials, checkout, network calls or listener are created here.
 * Production MUST inject trusted token verification, owner-scoped reads, and
 * a backend createProduct that calls the transactional PostgreSQL RPC.
 * Never expose this module as an anonymous Free editor endpoint.
 */
import {normalizeProductDraft} from './product-contract.mjs';
import {normalizeBrandDraft} from './brand-contract.mjs';

const PRODUCTS_PATH='/v2/catalog/products';
const BRANDS_PATH='/v2/catalog/brands';
const MAX_BODY_BYTES=16_384;
const AUTH=/^Bearer ([A-Za-z0-9._~-]{8,4096})$/;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ID=/^[a-zA-Z0-9_-]{1,80}$/;
const ERRORS=Object.freeze({
  UNAUTHENTICATED:401,PLAN_REQUIRED:403,PRODUCT_NOT_FOUND:404,
  BRAND_NOT_FOUND:404,PHOTO_NOT_FOUND:404,PRODUCT_QUOTA:409,
  BRAND_QUOTA:409,INVALID_BRAND:422,INVALID_PRODUCT:422
});
function fail(status,code){
  const error=new Error(code);
  error.httpStatus=status;
  error.code=code;
  return error;
}
function send(res,status,body,extra={}){
  if(res.headersSent||res.destroyed)return;
  res.writeHead(status,{
    'Content-Type':'application/json; charset=utf-8',
    'Cache-Control':'no-store, max-age=0',
    'X-Content-Type-Options':'nosniff',
    'Referrer-Policy':'no-referrer',
    'Vary':'Authorization',
    ...extra
  });
  res.end(JSON.stringify(body));
}
async function readJson(req){
  let size=0,overflow=false;
  const chunks=[];
  for await(const chunk of req){
    size+=chunk.length;
    if(size>MAX_BODY_BYTES){overflow=true;continue;}
    if(!overflow)chunks.push(chunk);
  }
  if(overflow)throw fail(413,'BODY_TOO_LARGE');
  let value;
  try{value=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw fail(400,'INVALID_JSON');}
  return value;
}
function safeProduct(row,expectedOwnerUid){
  if(!row||typeof row!=='object'||Array.isArray(row)||
      row.ownerUid!==expectedOwnerUid||!UUID.test(row.ownerUid??'')||
      typeof row.id!=='string'||!ID.test(row.id)||!UUID.test(row.brandId??''))
    throw fail(503,'CATALOG_UNAVAILABLE');
  const allowed=['id','brandId','name','description','category','priceCentavos','currency','photoAssetId'];
  const fields={};
  for(const key of allowed)if(Object.hasOwn(row,key))fields[key]=row[key];
  // Normalize through the same strict product contract used for incoming data.
  let draft;
  try{
    draft=normalizeProductDraft({
      brandId:fields.brandId,name:fields.name,description:fields.description,
      category:fields.category,priceCentavos:fields.priceCentavos,
      photoAssetId:fields.photoAssetId
    });
  }catch{throw fail(503,'CATALOG_UNAVAILABLE');}
  if(fields.currency!=='MXN')throw fail(503,'CATALOG_UNAVAILABLE');
  return {id:row.id,...draft};
}

function safeBrand(row,expectedOwnerUid){
  if(!row||typeof row!=='object'||Array.isArray(row)||
      row.ownerUid!==expectedOwnerUid||!UUID.test(row.ownerUid??'')||
      typeof row.id!=='string'||!UUID.test(row.id))
    throw fail(503,'CATALOG_UNAVAILABLE');
  let name;
  try{name=normalizeBrandDraft({name:row.name}).name;}
  catch{throw fail(503,'CATALOG_UNAVAILABLE');}
  return {id:row.id,name};
}

/**
 * authenticateBearer(token) must call the identity provider server-side and
 * resolve {uid} from a verified, unexpired session. Never decode JWT blindly.
 * listProducts(uid) may include ownerUid, but it MUST be owner-filtered.
 * createProduct(uid,draft) must recheck plan and quota in ONE DB transaction.
 */
export function createCatalogHttpHandler({authenticateBearer,listProducts,listBrands,createProduct,createBrand,
  allowedOrigins=[]}={}){
  if([authenticateBearer,listProducts,createProduct].some(x=>typeof x!=='function')||
      (listBrands!==undefined&&typeof listBrands!=='function')||
      (createBrand!==undefined&&typeof createBrand!=='function')||
      !Array.isArray(allowedOrigins)||allowedOrigins.some(x=>
        typeof x!=='string'||!/^https:\/\/[a-z0-9.-]+(?::[0-9]{1,5})?$/i.test(x)))
    throw new TypeError('Trusted catalog HTTP dependencies required');
  return async function catalogHandler(req,res){
    try{
      const isProducts=req.url===PRODUCTS_PATH;
      const isBrands=req.url===BRANDS_PATH;
      if(!isProducts&&!isBrands){send(res,404,{error:'NOT_FOUND'});return;}
      if((isBrands&&req.method!=='GET'&&
          (req.method!=='POST'||typeof createBrand!=='function'))||
          (isProducts&&req.method!=='GET'&&req.method!=='POST')){
        send(res,405,{error:'METHOD_NOT_ALLOWED'},
          {Allow:isBrands?(typeof createBrand==='function'?'GET, POST':'GET'):'GET, POST'});return;
      }
      const origin=req.headers.origin;
      if(origin&&(allowedOrigins.length===0||!allowedOrigins.includes(origin))){
        send(res,403,{error:'ORIGIN_FORBIDDEN'});return;
      }
      const header=req.headers.authorization;
      const match=typeof header==='string'?AUTH.exec(header):null;
      if(!match){send(res,401,{error:'UNAUTHENTICATED'});return;}
      let principal;
      try{principal=await authenticateBearer(match[1]);}catch{
        send(res,401,{error:'UNAUTHENTICATED'});return;
      }
      if(!principal||typeof principal.uid!=='string'||!UUID.test(principal.uid)){
        send(res,401,{error:'UNAUTHENTICATED'});return;
      }
      if(isBrands){
        if(req.method==='POST'){
          if(!/^application\\/json(?:\\s*;\\s*charset=utf-8)?$/i.test(
              req.headers['content-type']??'')){
            send(res,415,{error:'UNSUPPORTED_MEDIA_TYPE'});return;
          }
          const body=await readJson(req);
          let draft;
          try{draft=normalizeBrandDraft(body);}catch{
            send(res,422,{error:'INVALID_BRAND'});return;
          }
          const created=await createBrand(principal.uid,draft);
          send(res,201,{brand:safeBrand(created,principal.uid)});
          return;
        }
        if(typeof listBrands!=='function')throw fail(503,'CATALOG_UNAVAILABLE');
        const records=await listBrands(principal.uid);
        if(!Array.isArray(records)||records.length>5)
          throw fail(503,'CATALOG_UNAVAILABLE');
        const brands=records.map(row=>safeBrand(row,principal.uid));
        if(new Set(brands.map(b=>b.id)).size!==brands.length)
          throw fail(503,'CATALOG_UNAVAILABLE');
        send(res,200,{brands});return;
      }
      if(req.method==='GET'){
        const records=await listProducts(principal.uid);
        if(!Array.isArray(records)||records.length>250)
          throw fail(503,'CATALOG_UNAVAILABLE');
        const products=records.map(row=>safeProduct(row,principal.uid));
        if(new Set(products.map(p=>p.id)).size!==products.length)
          throw fail(503,'CATALOG_UNAVAILABLE');
        send(res,200,{products});
        return;
      }
      if(!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(req.headers['content-type']??'')){
        send(res,415,{error:'UNSUPPORTED_MEDIA_TYPE'});return;
      }
      const body=await readJson(req);
      let draft;
      try{draft=normalizeProductDraft(body);}catch{
        send(res,422,{error:'INVALID_PRODUCT'});return;
      }
      // Only owner uid extracted from verified token goes to the trusted RPC.
      const created=await createProduct(principal.uid,draft);
      send(res,201,{product:safeProduct(created,principal.uid)});
    }catch(error){
      const code=typeof error?.code==='string'?error.code:'';
      const status=error?.httpStatus===413?413:
        Object.hasOwn(ERRORS,code)?ERRORS[code]:
        error?.httpStatus===400?400:
        error?.httpStatus===503?503:503;
      send(res,status,{error:status===503?'CATALOG_UNAVAILABLE':
        status===413?'BODY_TOO_LARGE':
        status===400?'INVALID_JSON':code});
    }
  };
}
