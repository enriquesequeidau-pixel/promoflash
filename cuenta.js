import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.10/+esm';
const config=window.PROMOFLASH_CONFIG||{};
const $=id=>document.getElementById(id);
const btns=['signIn','signUp','signOut','refreshPro','startPro'];
const setBusy=v=>btns.forEach(id=>{if($(id))$(id).disabled=v});
const client=createClient(config.supabaseUrl,config.supabaseAnonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
function message(id,value,ok=false){$(id).textContent=value;$(id).className='status '+(ok?'okay':'bad')}
function readable(e){return e?.message==='Invalid login credentials'?'Correo o contraseña incorrectos.':(e?.message||'Error desconocido. Intenta nuevamente.')}
async function render(){const {data:{user},error}=await client.auth.getUser();if(error||!user){$('signedOut').classList.remove('hidden');$('signedIn').classList.add('hidden');return;}$('signedOut').classList.add('hidden');$('signedIn').classList.remove('hidden');$('userEmail').textContent=user.email||'Cuenta activa';$('startPro').disabled=!config.proPaymentsEnabled;await refreshPro(user.id)}
async function refreshPro(id){$('proState').textContent='Consultando tu estado Pro…';const{data,error}=await client.from('pro_entitlements').select('active,verified_at').eq('user_id',id).maybeSingle();if(error){$('proState').textContent='No fue posible comprobar el acceso Pro. Vuelve a intentarlo.';return}$('proState').textContent=data?.active?'✓ Tu acceso Pro figura activo.':'Plan gratis · Tu acceso Pro aún no está habilitado.';$('proTools').classList.toggle('hidden',!data?.active)}
async function startCheckout(){
 if(!config.proPaymentsEnabled){message('accountNotice','Los pagos aún no están habilitados: estamos probando la verificación de suscripciones.');return;}
 const {data:{session}}=await client.auth.getSession();
 if(!session){message('accountNotice','Inicia sesión para continuar.');return;}
 $('startPro').disabled=true;
 try {
  const response=await fetch(config.supabaseUrl+'/functions/v1/promoflash-checkout',{
   method:'POST', headers:{'Authorization':'Bearer '+session.access_token,'apikey':config.supabaseAnonKey,'Content-Type':'application/json'}, body:JSON.stringify({})});
  const data=await response.json();
  if(!response.ok||!data.checkout_url)throw new Error(data.error||'Checkout no disponible.');
  const url=new URL(data.checkout_url);
  if(url.protocol!=='https:'||!(url.hostname==='mercadopago.cl'||url.hostname.endsWith('.mercadopago.cl')||url.hostname==='mercadopago.com'||url.hostname.endsWith('.mercadopago.com')))throw new Error('URL de pago inesperada.');
  window.location.assign(url.href);
 }catch(e){message('accountNotice',e.message||'No se pudo iniciar el pago.');$('startPro').disabled=false;}
}
async function auth(action){const email=$('email').value.trim(),password=$('password').value;if(!email||!password){message('notice','Ingresa correo y contraseña.');return}if(password.length<8){message('notice','La contraseña debe tener al menos 8 caracteres.');return}setBusy(true);try{const{data,error}=action==='signup'?await client.auth.signUp({email,password,options:{emailRedirectTo:new URL('cuenta.html',location.href).href}}):await client.auth.signInWithPassword({email,password});if(error){message('notice',readable(error));return}if(action==='signup'&&!data.session){message('notice','Revisa tu correo para confirmar tu cuenta y luego inicia sesión.',true)}else{message('notice','Sesión iniciada.',true);await render()}}catch(e){message('notice',readable(e))}finally{setBusy(false)}}
$('startPro').addEventListener('click',startCheckout);
$('signIn').addEventListener('click',()=>auth('signin'));
$('signUp').addEventListener('click',()=>auth('signup'));
$('signOut').addEventListener('click',async()=>{setBusy(true);await client.auth.signOut();setBusy(false);await render()});
$('refreshPro').addEventListener('click',async()=>{const{data:{user}}=await client.auth.getUser();if(user)$('startPro').disabled=!config.proPaymentsEnabled;await refreshPro(user.id)});
client.auth.onAuthStateChange(()=>{queueMicrotask(()=>render())});
render();

$('proGenerate').addEventListener('click',async()=>{const out=$('proOutput');out.textContent='Generando…';try{const{data:{session}}=await client.auth.getSession();if(!session)throw Error('Inicia sesión');const response=await fetch(config.supabaseUrl+'/functions/v1/promoflash-pro-studio',{method:'POST',headers:{'Authorization':'Bearer '+session.access_token,'apikey':config.supabaseAnonKey,'Content-Type':'application/json'},body:JSON.stringify({shop:$('proShop').value,product:$('proProduct').value,voice:$('proVoice').value})});const d=await response.json();if(!response.ok)throw Error(d.error||'No disponible');out.replaceChildren();const ul=document.createElement('ul');for(const line of d.headlines||[]){const li=document.createElement('li');li.textContent=line;ul.appendChild(li)}out.append(ul)}catch(e){out.textContent=e.message||'Error'}});
