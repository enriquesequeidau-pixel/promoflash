(()=>{
const cfg=window.PROMOFLASH_CONFIG||{},p=new URLSearchParams(location.search);
const allowed=['utm_source','utm_medium','utm_campaign','utm_content','utm_term'];
const carry=new URLSearchParams();for(const name of allowed){const val=p.get(name);if(val)carry.set(name,val.slice(0,100));}
for(const a of document.querySelectorAll('a[href="editor.html"]'))a.href='editor.html'+(carry.toString()?'?'+carry:'');
const embeds=window.PROMOFLASH_DEMOS||[];
for(const img of document.querySelectorAll('img[data-demo]')){const i=Number(img.dataset.demo)-1;if(embeds[i])img.src=embeds[i];}
function event(name,props={}){try{if(typeof window.plausible==='function')window.plausible(name,{props});if(typeof window.gtag==='function')window.gtag('event',name,props);if(typeof window.fbq==='function')window.fbq('trackCustom',name,props);}catch(e){}}
for(const a of document.querySelectorAll('a[data-event]'))a.addEventListener('click',()=>event(a.dataset.event,{utm_campaign:carry.get('utm_campaign')||''}));
// Marketing tags are loaded only after an affirmative analytics choice.
function startAnalytics(){if(cfg.ga4MeasurementId){const s=document.createElement('script');s.async=true;s.src='https://www.googletagmanager.com/gtag/js?id='+encodeURIComponent(cfg.ga4MeasurementId);document.head.appendChild(s);window.dataLayer=window.dataLayer||[];window.gtag=function(){window.dataLayer.push(arguments)};window.gtag('js',new Date());window.gtag('config',cfg.ga4MeasurementId)}if(cfg.metaPixelId){!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');window.fbq('init',cfg.metaPixelId);window.fbq('track','PageView')}if(cfg.plausibleDomain){const s=document.createElement('script');s.defer=true;s.src='https://plausible.io/js/script.js';s.dataset.domain=cfg.plausibleDomain;document.head.appendChild(s)}}
const hasAnalytics=!!(cfg.ga4MeasurementId||cfg.metaPixelId||cfg.plausibleDomain);
let choice=null;try{choice=localStorage.getItem('promoflash_analytics_choice')}catch(e){}
if(choice==='yes')startAnalytics();else if(hasAnalytics&&choice!=='no'){
const banner=document.createElement('div');banner.id='consentBanner';banner.setAttribute('role','dialog');banner.setAttribute('aria-label','Preferencias de analítica');banner.style.cssText='position:fixed;bottom:16px;left:16px;right:16px;max-width:680px;z-index:90;margin:auto;padding:16px;background:#171629;color:white;border-radius:16px;box-shadow:0 16px 50px #2227;display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;font:13px system-ui';
const words=document.createElement('div');words.textContent='¿Nos permites usar analítica para mejorar PromoFlash? Puedes rechazarla y seguir usando todo gratis.';words.style.flex='1 1 320px';
const accept=document.createElement('button');accept.textContent='Aceptar';const decline=document.createElement('button');decline.textContent='Rechazar';for(const b of [accept,decline]){b.style.cssText='border:0;border-radius:9px;padding:10px 14px;font-weight:800;cursor:pointer'}accept.style.background='#dbff53';decline.style.background='#3c3a58';decline.style.color='#fff';
function choose(v){try{localStorage.setItem('promoflash_analytics_choice',v)}catch(e){}banner.remove();if(v==='yes')startAnalytics()}
accept.onclick=()=>choose('yes');decline.onclick=()=>choose('no');banner.append(words,accept,decline);document.body.appendChild(banner);
}
})();
