(()=>{
const cfg=window.PROMOFLASH_CONFIG||{},p=new URLSearchParams(location.search);
const allowed=['utm_source','utm_medium','utm_campaign','utm_content','utm_term'];
const carry=new URLSearchParams();for(const name of allowed){const val=p.get(name);if(val)carry.set(name,val.slice(0,100));}
for(const a of document.querySelectorAll('a[href="editor.html"]'))a.href='editor.html'+(carry.toString()?'?'+carry:'');
const embeds=window.PROMOFLASH_DEMOS||[];
for(const img of document.querySelectorAll('img[data-demo]')){const i=Number(img.dataset.demo)-1;if(embeds[i])img.src=embeds[i];}
function event(name,props={}){try{
if(localStorage.getItem('promoflash_analytics_choice')==='yes'&&name==='landing_view'){
fetch((cfg.factoryApiUrl||cfg.supabaseUrl)+'/functions/v1/promoflash-events',{method:'POST',headers:{'Content-Type':'application/json','apikey':(cfg.factoryApiKey||cfg.supabaseAnonKey)},body:JSON.stringify({event_name:name,utm_campaign:carry.get('utm_campaign')||'',utm_source:carry.get('utm_source')||'',utm_medium:carry.get('utm_medium')||''}),keepalive:true}).catch(()=>{});
}
if(typeof window.plausible==='function')window.plausible(name,{props});if(typeof window.gtag==='function')window.gtag('event',name,props);if(typeof window.fbq==='function')window.fbq('trackCustom',name,props);}catch(e){}}
for(const a of document.querySelectorAll('a[data-event]'))a.addEventListener('click',()=>event(a.dataset.event,{utm_campaign:carry.get('utm_campaign')||''}));
// Marketing tags are loaded only after an affirmative analytics choice.
function startAnalytics(){if(cfg.ga4MeasurementId){const s=document.createElement('script');s.async=true;s.src='https://www.googletagmanager.com/gtag/js?id='+encodeURIComponent(cfg.ga4MeasurementId);document.head.appendChild(s);window.dataLayer=window.dataLayer||[];window.gtag=function(){window.dataLayer.push(arguments)};window.gtag('js',new Date());window.gtag('config',cfg.ga4MeasurementId)}if(cfg.metaPixelId){!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');window.fbq('init',cfg.metaPixelId);window.fbq('track','PageView')}if(cfg.plausibleDomain){const s=document.createElement('script');s.defer=true;s.src='https://plausible.io/js/script.js';s.dataset.domain=cfg.plausibleDomain;document.head.appendChild(s)}}
// La navegación funciona sin consentimiento; únicamente medir al activar voluntariamente.
let choice=null;try{choice=localStorage.getItem('promoflash_analytics_choice')}catch(e){}
if(choice==='yes'){startAnalytics();event('landing_view')}

const privacyLink=document.querySelector('footer.footer a[href="privacidad.html"]');
if(privacyLink){
 const opt=document.createElement('button');opt.type='button';opt.id='analyticsPreference';
 opt.textContent=choice==='yes'?'Desactivar estadísticas':'Permitir estadísticas';
 opt.title='Las estadísticas de uso son opcionales. No se activan sin tu permiso.';
 opt.style.cssText='background:none;border:0;padding:0 0 0 12px;color:inherit;text-decoration:underline;font:inherit;cursor:pointer';
 opt.addEventListener('click',()=>{try{localStorage.setItem('promoflash_analytics_choice',choice==='yes'?'no':'yes')}catch(e){}location.reload()});
 privacyLink.insertAdjacentElement('afterend',opt);
}
})();
