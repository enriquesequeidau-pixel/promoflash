/**
 * PromoFlash v2: IN-MEMORY SANDBOX ONLY. No Supabase, persistence or production auth.
 * Demonstrates a trusted-server catalog contract for tests. Never import from Free UI.
 * authenticate must validate the opaque request credential server-side and return
 * {uid,plan}; ownsBrand/ownsPhoto must query trusted owner-scoped storage.
 */
import {randomUUID} from 'node:crypto';
import {normalizeProductDraft} from './product-contract.mjs';
import {PLAN_LIMITS} from './brand-contract.mjs';

function failure(status,code){
  const error=new Error(code);
  error.status=status;
  error.code=code;
  return error;
}
export function createCatalogSandbox({authenticate,ownsBrand,ownsPhoto,makeId=randomUUID}={}){
  if([authenticate,ownsBrand,ownsPhoto,makeId].some(fn=>typeof fn!=='function'))
    throw new TypeError('Trusted sandbox dependencies required');
  const records=new Map();
  const tails=new Map();
  async function principal(request){
    const identity=await authenticate(request);
    if(!identity||typeof identity.uid!=='string'||!identity.uid.trim()||
       !Object.hasOwn(PLAN_LIMITS,identity.plan))throw failure(401,'UNAUTHENTICATED');
    return {uid:identity.uid,plan:identity.plan};
  }
  async function locked(uid,fn){
    const previous=tails.get(uid)||Promise.resolve();
    let release;
    const gate=new Promise(resolve=>{release=resolve;});
    const tail=previous.then(()=>gate);
    tails.set(uid,tail);
    await previous;
    try{return await fn();}
    finally{
      release();
      if(tails.get(uid)===tail)tails.delete(uid);
    }
  }
  function writable(identity){
    if(identity.plan==='free')throw failure(403,'PLAN_REQUIRED');
  }
  function validate(draft){
    try{return normalizeProductDraft(draft);}
    catch(error){
      if(error.code==='INVALID_PRODUCT')throw failure(422,'INVALID_PRODUCT');
      throw error;
    }
  }
  async function related(identity,product){
    if(await ownsBrand(identity.uid,product.brandId)!==true)
      throw failure(404,'BRAND_NOT_FOUND');
    if(product.photoAssetId&&await ownsPhoto(identity.uid,product.photoAssetId)!==true)
      throw failure(404,'PHOTO_NOT_FOUND');
  }
  function publicRecord(record){
    const {ownerUid,...visible}=record;
    return Object.freeze({...visible});
  }
  return Object.freeze({
    async list(request){
      const identity=await principal(request);
      return Object.freeze([...records.values()]
        .filter(record=>record.ownerUid===identity.uid)
        .map(publicRecord));
    },
    async create(request,draft){
      const identity=await principal(request);
      writable(identity);
      const product=validate(draft);
      return locked(identity.uid,async()=>{
        // Re-read entitlement inside a serialized operation: a server adapter
        // must additionally use a database transaction for cross-process safety.
        const current=await principal(request);
        writable(current);
        if(current.uid!==identity.uid)throw failure(401,'IDENTITY_CHANGED');
        await related(current,product);
        const count=[...records.values()].filter(r=>r.ownerUid===current.uid).length;
        if(count>=PLAN_LIMITS[current.plan].products)throw failure(409,'PRODUCT_QUOTA');
        const id=makeId();
        if(typeof id!=='string'||!id||records.has(id))throw failure(409,'ID_CONFLICT');
        const record=Object.freeze({id,ownerUid:current.uid,...product});
        records.set(id,record);
        return publicRecord(record);
      });
    },
    /**
     * Copy a product with fresh authorization, ownership and quota checks.
     * SANDBOX ONLY: in-memory lock is not cross-process transactional.
     */
    async duplicate(request,id){
      const identity=await principal(request);
      writable(identity);
      return locked(identity.uid,async()=>{
        const current=await principal(request);
        writable(current);
        if(current.uid!==identity.uid)throw failure(401,'IDENTITY_CHANGED');
        const source=records.get(id);
        if(!source||source.ownerUid!==current.uid)throw failure(404,'PRODUCT_NOT_FOUND');
        const {id:oldId,ownerUid,...product}=source;
        await related(current,product);
        const count=[...records.values()].filter(r=>r.ownerUid===current.uid).length;
        if(count>=PLAN_LIMITS[current.plan].products)throw failure(409,'PRODUCT_QUOTA');
        const newId=makeId();
        if(typeof newId!=='string'||!newId||records.has(newId))throw failure(409,'ID_CONFLICT');
        const record=Object.freeze({id:newId,ownerUid:current.uid,...product});
        records.set(newId,record);
        return publicRecord(record);
      });
    },
    async update(request,id,draft){
      const identity=await principal(request);
      writable(identity);
      const product=validate(draft);
      return locked(identity.uid,async()=>{
        const current=await principal(request);
        writable(current);
        if(current.uid!==identity.uid)throw failure(401,'IDENTITY_CHANGED');
        const existing=records.get(id);
        if(!existing||existing.ownerUid!==current.uid)throw failure(404,'PRODUCT_NOT_FOUND');
        await related(current,product);
        const record=Object.freeze({id,ownerUid:current.uid,...product});
        records.set(id,record);
        return publicRecord(record);
      });
    },
    async remove(request,id){
      const identity=await principal(request);
      writable(identity);
      return locked(identity.uid,async()=>{
        const current=await principal(request);
        writable(current);
        if(current.uid!==identity.uid)throw failure(401,'IDENTITY_CHANGED');
        const existing=records.get(id);
        if(!existing||existing.ownerUid!==current.uid)throw failure(404,'PRODUCT_NOT_FOUND');
        records.delete(id);
        return true;
      });
    }
  });
}
