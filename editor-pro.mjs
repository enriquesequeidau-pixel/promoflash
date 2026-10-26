/** Integración Pro en el editor Free: usa la misma sesión de la página de cuenta.
 * Sin pago, sin conceder entitlements, sin subir fotos ni almacenar JWT en disco.
 */
// Import Supabase only for a user who already signed in to PromoFlash.
// Anonymous Free must never download third-party auth dependencies.
import {tabScopedAuthStorage} from "./auth-storage.mjs";
import {normalizeProStudioResponse,applyProHeadline} from "./v2/pro-editor-core.mjs";
import {mexicanSeasonalKit,whatsappSalesText,campaignCalendarIcs} from "./v2/pro-mexico-tools.mjs";
const cfg=window.PROMOFLASH_CONFIG||{};
const $=id=>document.getElementById(id);
const status=$("pfProStatus"),actions=$("pfProActions"),results=$("pfProSuggestions");
const generate=$("pfProGenerate");
const source=cfg.accountSupabaseUrl||cfg.supabaseUrl;
const publishable=cfg.accountSupabaseAnonKey||cfg.supabaseAnonKey;
let client=null,epoch=0,activeUserId=null,busy=false;
const clear=()=>{results?.replaceChildren();actions.hidden=true;activeUserId=null;};
const tell=message=>{status.textContent=message;};
const safe=()=>Boolean(client&&source&&publishable);
const errorMessage=code=>({
 auth_required:"Inicia sesión en Mi cuenta para usar Pro.",
 invalid_session:"Tu sesión venció. Inicia sesión nuevamente.",
 pro_required:"Esta función necesita un plan Pro vigente.",
 invalid_fields:"Revisa el nombre de la tienda y el producto.",
 save_failed:"No pudimos guardar tu identidad de marca. Intenta nuevamente."
}[code]||"No se pudo generar el texto Pro. Vuelve a intentarlo.");
async function verify(){
 const version=++epoch;
 clear();
 if(!safe()){tell("Pro no está disponible en esta configuración.");return;}
 const {data:{user},error}=await client.auth.getUser();
 if(version!==epoch)return;
 if(error||!user){tell("Editor gratis disponible. Entra en Mi cuenta para utilizar las funciones Pro.");return;}
 const {data, error:entError}=await client.from("pro_entitlements")
  .select("active,verified_at").eq("user_id",user.id).maybeSingle();
 if(version!==epoch)return;
 if(entError||data?.active!==true){tell("Cuenta conectada. Tu plan Pro todavía no está activo.");return;}
 activeUserId=user.id;actions.hidden=false;
 tell("✓ Acceso Pro reconocido. Los textos se verifican nuevamente al generarlos.");
}
async function generateCopy(){
 if(busy||!activeUserId||!safe())return;
 busy=true;generate.disabled=true;results.replaceChildren();tell("Verificando acceso Pro…");
 const version=epoch,userId=activeUserId;
 try{
  const {data:{session}}=await client.auth.getSession();
  if(!session?.access_token)throw new Error("auth_required");
  const {data:{user}}=await client.auth.getUser();
  if(!user||user.id!==userId)throw new Error("invalid_session");
  const shop=$("brand").value.trim().slice(0,60);
  const product=$("productName").value.trim().slice(0,65);
  const voice=$("pfProVoice").value;
  if(!shop||!product)throw new Error("invalid_fields");
  const response=await fetch(source+"/functions/v1/promoflash-pro-studio",{
   method:"POST",headers:{"Authorization":"Bearer "+session.access_token,
      "apikey":publishable,"Content-Type":"application/json"},
   credentials:"omit",cache:"no-store",body:JSON.stringify({shop,product,voice})
  });
  const payload=await response.json();
  if(!response.ok)throw new Error(payload?.error||"request_failed");
  const options=normalizeProStudioResponse(payload);
  if(version!==epoch||activeUserId!==userId)return;
  // Do not display one account's private results after a session change.
  const current=await client.auth.getUser();
  if(version!==epoch||current.data.user?.id!==userId){clear();return;}
  const list=document.createElement("div");list.className="pf-pro-suggestions";
  for(const option of options){
    const btn=document.createElement("button");btn.type="button";
    btn.textContent=option.full+" · "+option.cta;
    btn.addEventListener("click",()=>{
      if(version!==epoch||activeUserId!==userId)return;
      applyProHeadline(document,option);
      tell("Texto aplicado a tus promociones. Puedes editarlo antes de descargar.");
    });
    list.append(btn);
  }
  results.replaceChildren(list);
  tell("3 ideas listas. Selecciona una para aplicarla al editor.");
 }catch(error){
  if(version===epoch)tell(errorMessage(error?.message));
 }finally{
  busy=false;generate.disabled=false;
 }
}
const AUTH_KEY="sequeidaulabs-promoflash-auth-v1";
function hasExistingAccountSession(){
 try{
  return Boolean(window.sessionStorage.getItem(AUTH_KEY)||window.localStorage.getItem(AUTH_KEY));
 }catch{return false;}
}
async function startProForExistingSession(){
 if(!source||!publishable){tell("El editor gratis está disponible. Pro se está configurando.");return;}
 if(!hasExistingAccountSession()){
  tell("Editor gratis disponible. Entra en Mi cuenta para usar Pro.");return;
 }
 try{
  // No CDN fetches, billing requests, or account writes during anonymous Free usage.
  const {createClient}=await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.0/+esm");
  client=createClient(source,publishable,{auth:{
   persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,
   storage:tabScopedAuthStorage("sequeidaulabs-promoflash-auth-v1"),
   storageKey:"sequeidaulabs-promoflash-auth-v1"
  }});
  client.auth.onAuthStateChange(()=>{epoch++;clear();queueMicrotask(()=>void verify());});
  void verify();
 }catch{tell("No se pudo iniciar la sesión Pro. El editor gratis sigue disponible.");}
}
void startProForExistingSession();
generate?.addEventListener("click",()=>void generateCopy());
$("pfProRefresh")?.addEventListener("click",()=>void verify());

/** Every optional local Pro tool rechecks fresh server-sourced access.
 * This does not replace backend authorization for paid catalog writes.
 */
const proToolStatus=$("pfProToolStatus");
const signal=(message)=>{if(proToolStatus)proToolStatus.textContent=message;};
async function authenticatedForTool(){
 if(!safe()||!activeUserId)return false;
 const checkpoint=epoch,userId=activeUserId;
 const {data:{user},error}=await client.auth.getUser();
 if(error||user?.id!==userId||checkpoint!==epoch)return false;
 const {data:ent, error:entError}=await client.from("pro_entitlements")
  .select("active").eq("user_id",userId).maybeSingle();
 if(checkpoint!==epoch||activeUserId!==userId)return false;
 if(entError||ent?.active!==true){clear();tell("Tu acceso Pro ya no está vigente.");return false;}
 return true;
}
function editorValue(id){return $(id)?.value?.trim()||"";}
function updateEditor(patch){
 for(const [id,value] of Object.entries(patch)){
  const el=$(id);if(!el)throw new Error("EDITOR_UNAVAILABLE");
  el.value=value.slice(0,el.maxLength>0?el.maxLength:100);
  el.dispatchEvent(new Event("input",{bubbles:true}));
 }
 const advanced=$("advancedSettings");
 if(advanced)advanced.open=true;
}
async function runProTool(id,work){
 const btn=$(id);
 btn?.addEventListener("click",async()=>{
  if(!btn||btn.disabled)return;
  btn.disabled=true;signal("Verificando el acceso Pro…");
  try{
   if(!(await authenticatedForTool())){signal("Inicia sesión con acceso Pro vigente.");return;}
   await work();
  }catch{signal("No se pudo completar la acción. Revisa los datos e intenta nuevamente.");}
  finally{btn.disabled=false;}
 });
}
void runProTool("pfProApplySeason",async()=>{
 const kit=mexicanSeasonalKit($("pfProSeason").value);
 updateEditor({headline:kit.headline,subtitle:kit.subtitle,
   discount:kit.discount,cta:kit.cta});
 signal("Pack "+kit.name+" aplicado. Personaliza tu oferta antes de publicar.");
});
void runProTool("pfProWhatsApp",async()=>{
 const copy=whatsappSalesText({shop:editorValue("brand"),
  product:editorValue("productName"),price:editorValue("price"),
  cta:editorValue("cta"),headline:editorValue("headline")});
 try{
  if(!navigator.clipboard?.writeText)throw new Error("CLIPBOARD_UNAVAILABLE");
  await navigator.clipboard.writeText(copy);
  signal("Texto comercial copiado. Pégalo en WhatsApp.");
 }catch{signal("Copia este texto para WhatsApp: "+copy);}
});
void runProTool("pfProNine",async()=>{
 const exporter=window.PromoFlashDemo?.exportNineLocal;
 if(typeof exporter!=="function")throw new Error("EDITOR_UNAVAILABLE");
 const count=await exporter();
 signal("ZIP con "+count+" imágenes generado en tu dispositivo.");
});
const monthPicker=$("pfProCalendarMonth");
if(monthPicker&&!monthPicker.value){
 const date=new Date();
 monthPicker.value=date.getFullYear()+"-"+String(date.getMonth()+1).padStart(2,"0");
}
void runProTool("pfProCalendar",async()=>{
 const value=monthPicker?.value||"";
 if(!/^20[2-9][0-9]-(0[1-9]|1[0-2])$/.test(value))throw new Error("CALENDAR_INVALID");
 const calendar=campaignCalendarIcs({year:Number(value.slice(0,4)),
  month:Number(value.slice(5,7)),shop:editorValue("brand"),
  product:editorValue("productName"),
  category:document.querySelector(".category.active")?.dataset.category||"home"});
 const blob=new Blob([calendar],{type:"text/calendar;charset=utf-8"});
 const url=URL.createObjectURL(blob);
 try{
  const a=document.createElement("a");a.href=url;
  a.download="PromoFlash-calendario-"+value+".ics";
  document.body.appendChild(a);a.click();a.remove();
 }finally{setTimeout(()=>URL.revokeObjectURL(url),10000);}
 signal("Calendario de cuatro publicaciones descargado. Puedes abrirlo en tu aplicación de calendario.");
});
