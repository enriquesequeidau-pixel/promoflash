/* Limit Supabase access/refresh tokens to a browser tab.
 * Preserve one existing localStorage session on its next account-page load,
 * then erase the persistent copy only after sessionStorage has accepted it.
 * Never read or migrate credentials from another app's storage key.
 */
export function tabScopedAuthStorage(key){
 if(typeof key!=='string'||!/^[a-z0-9-]{12,100}$/.test(key))throw Error('Invalid app-scoped Auth storage key');
 const tab=window.sessionStorage;
 try{
  const permanent=window.localStorage,old=permanent.getItem(key);
  if(old){
   let data=null;
   try{data=JSON.parse(old);}catch{}
   const usable=Boolean(data&&typeof data==='object'&&typeof data.access_token==='string'&&typeof data.refresh_token==='string');
   if(usable&&!tab.getItem(key))tab.setItem(key,old);
   // Erase invalid credentials, or a valid copy only after tab storage succeeded.
   if(!usable||tab.getItem(key))permanent.removeItem(key);
  }
 }catch{/* Restricted browser storage: no cross-app fallback; SDK handles storage errors. */}
 return tab;
}
