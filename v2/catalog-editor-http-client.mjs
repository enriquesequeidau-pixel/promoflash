/**
 * PromoFlash v2 — opt-in catalog picker HTTP client for authenticated editors.
 *
 * No credentials, storage, paid flags or startup side effects in this module.
 * Caller obtains an access token from the verified account session and MUST
 * call attachCatalogEditorButton(...).setRequest(null) on logout/account change.
 * Never import from the anonymous Free editor until gated UI QA is approved.
 */
const TOKEN=/^[A-Za-z0-9._~-]{8,4096}$/;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ID=/^[a-zA-Z0-9_-]{1,80}$/;
function fail(code){
  const error=new Error(code);
  error.code=code;
  return error;
}
export function createCatalogEditorHttpClient({fetcher=globalThis.fetch}={}){
  if(typeof fetcher!=='function')throw new TypeError('Trusted fetch dependency required');
  async function get(path,token){
    if(typeof token!=='string'||!TOKEN.test(token))throw fail('UNAUTHENTICATED');
    let response;
    try{
      response=await fetcher(path,{
        method:'GET',headers:{Authorization:'Bearer '+token},
        credentials:'omit',cache:'no-store',redirect:'error',
        mode:'same-origin',referrerPolicy:'no-referrer'
      });
    }catch{throw fail('CATALOG_UNAVAILABLE');}
    if(response?.status===401)throw fail('UNAUTHENTICATED');
    if(response?.status===403)throw fail('PLAN_REQUIRED');
    if(response?.status!==200)throw fail('CATALOG_UNAVAILABLE');
    try{return await response.json();}
    catch{throw fail('CATALOG_UNAVAILABLE');}
  }
  async function list(token){
    const data=await get('/v2/catalog/products',token);
    if(!data||!Array.isArray(data.products)||data.products.length>250||
        data.products.some(p=>!p||typeof p!=='object'||!ID.test(p.id??''))||
        new Set(data.products.map(p=>p.id)).size!==data.products.length)
      throw fail('CATALOG_UNAVAILABLE');
    return data.products;
  }
  async function getName(token,brandId){
    if(typeof brandId!=='string'||!UUID.test(brandId))throw fail('BRAND_NOT_FOUND');
    const data=await get('/v2/catalog/brands',token);
    if(!data||!Array.isArray(data.brands)||data.brands.length>5||
        data.brands.some(b=>!b||typeof b!=='object'||!UUID.test(b.id??'')||
          typeof b.name!=='string')||
        new Set(data.brands.map(b=>b.id)).size!==data.brands.length)
      throw fail('CATALOG_UNAVAILABLE');
    const match=data.brands.filter(b=>b.id===brandId);
    if(match.length!==1)throw fail('BRAND_NOT_FOUND');
    return match[0].name;
  }
  return Object.freeze({
    catalog:Object.freeze({list}),
    brands:Object.freeze({getName})
  });
}
