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
  if(old&&!tab.getItem(key)){
   let data;
   try{data=JSON.parse(old);}catch{data=null;}
   if(data&&typeof data==='object'&&typeof data.access_token==='string'&&typeof data.refresh_token==='string')
    tab.setItem(key,old);
  }
  // Stale or unusable persistent credentials must not outlive the transition.
  // Do not remove a valid login unless the tab copy has been written.
  if(!old||tab.getItem(key)||!JSON.parse(old)?.access_token)permanent.removeItem(key);
 }catch{/* Restricted browser storage: no cross-app fallback; SDK handles storage errors. */}
 return tab;
}
