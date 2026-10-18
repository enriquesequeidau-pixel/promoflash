/* Optional ad & conversion tracking, only after consent. No credentials in client files. */
(()=>{
const cfg=window.PROMOFLASH_CONFIG||{};
const allowed=['utm_source','utm_medium','utm_campaign','utm_content'];
const p=new URLSearchParams(location.search);const utm={};for(const k of allowed)if(p.get(k))utm[k]=p.get(k).slice(0,100);
try{if(Object.keys(utm).length)sessionStorage.setItem('pf_utm',JSON.stringify(utm));}catch(e){}
function start(){if(cfg.ga4MeasurementId){const s=document.createElement('script');s.async=true;s.src='https://www.googletagmanager.com/gtag/js?id='+encodeURIComponent(cfg.ga4MeasurementId);document.head.appendChild(s);window.dataLayer=window.dataLayer||[];window.gtag=function(){window.dataLayer.push(arguments)};window.gtag('js',new Date());window.gtag('config',cfg.ga4MeasurementId)}if(cfg.metaPixelId){!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');window.fbq('init',cfg.metaPixelId);window.fbq('track','PageView')}if(cfg.plausibleDomain){const s=document.createElement('script');s.defer=true;s.dataset.domain=cfg.plausibleDomain;s.src='https://plausible.io/js/script.js';document.head.appendChild(s)}}
window.PROMOFLASH_TRACK=(name,props={})=>{let detail=props;try{detail={...JSON.parse(sessionStorage.getItem('pf_utm')||'{}'),...props}}catch(e){}try{if(window.gtag)window.gtag('event',name,detail);if(window.fbq)window.fbq('trackCustom',name,detail);if(window.plausible)window.plausible(name,{props:detail})}catch(e){}};
let choice=null;try{choice=localStorage.getItem('promoflash_analytics_choice')}catch(e){}
if(choice==='yes')start();
if(!choice&&(cfg.ga4MeasurementId||cfg.metaPixelId||cfg.plausibleDomain)){
const div=document.createElement('div');div.style.cssText='position:fixed;bottom:14px;left:14px;right:14px;max-width:630px;margin:auto;background:#18172c;color:white;padding:15px;border-radius:15px;z-index:100;box-shadow:0 14px 45px #2225;display:flex;gap:12px;align-items:center;flex-wrap:wrap;font:13px system-ui';
const txt=document.createElement('span');txt.textContent='¿Autorizas medición anónima de uso y publicidad? Puedes rechazar y seguir usando el editor.';txt.style.flex='1 1 260px';const ok=document.createElement('button'),no=document.createElement('button');ok.textContent='Aceptar';no.textContent='Rechazar';for(const b of [ok,no])b.style.cssText='border:0;border-radius:9px;padding:9px 12px;cursor:pointer;font-weight:700';ok.style.background='#dbff53';no.style.background='#ccc';
function choose(v){try{localStorage.setItem('promoflash_analytics_choice',v)}catch(e){}div.remove();if(v==='yes')start()}
ok.onclick=()=>choose('yes');no.onclick=()=>choose('no');div.append(txt,ok,no);document.body.appendChild(div);
}
})();
