/** PromoFlash Pro México: herramientas locales, sin imágenes ni datos enviados.
 * Una interfaz Pro puede usar estas utilidades DESPUÉS de verificar permisos.
 * No otorga acceso, no persiste campañas ni constituye comprobante de pago.
 */
const KITS=Object.freeze({
 buen_fin:Object.freeze({name:'Buen Fin',headline:'¡OFERTAS PARA APROVECHAR!',subtitle:'Precios especiales por tiempo limitado',discount:'BUEN FIN',cta:'APROVECHA HOY'}),
 muertos:Object.freeze({name:'Día de Muertos',headline:'TRADICIÓN QUE NOS INSPIRA',subtitle:'Celebra nuestras tradiciones con cariño',discount:'EDICIÓN MX',cta:'DESCUBRE MÁS'}),
 navidad:Object.freeze({name:'Navidad mexicana',headline:'REGALA ALGO ESPECIAL',subtitle:'Detalles hechos para compartir alegría',discount:'NAVIDAD',cta:'ELIGE TU REGALO'}),
 clases:Object.freeze({name:'Regreso a clases',headline:'PREPÁRATE PARA VOLVER',subtitle:'Todo listo para empezar con energía',discount:'VUELTA A CLASES',cta:'VER NOVEDADES'})
});
const BAD=/[\u0000-\u001f\u007f-\u009f\u200e\u200f\u202a-\u202e\u2066-\u2069\ud800-\udfff]/u;
const clean=(value,max)=>typeof value==='string'?value.replace(BAD,' ').replace(/\s+/gu,' ').trim().slice(0,max):'';
export const mexicoKitKeys=Object.freeze(Object.keys(KITS));
export function mexicanSeasonalKit(key){
 if(typeof key!=='string'||!Object.hasOwn(KITS,key))throw new TypeError('KIT_INVALID');
 return KITS[key];
}
export function whatsappSalesText({shop,product,price,cta='Escríbenos',headline=''}={}){
 const s=clean(shop,60),p=clean(product,80),v=clean(price,30),h=clean(headline,90),action=clean(cta,45);
 if(!s||!p)throw new TypeError('COPY_INVALID');
 return ['✨ '+(h||'¡Hola! Tenemos una promo para ti'),p+(v?' · '+v:''),'Disponible en '+s+'.',action||'Escríbenos'].join('\n');
}
const pad=n=>String(n).padStart(2,'0');
const day=(year,month,date)=>String(year)+pad(month)+pad(date);
const ics=(s)=>s.replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/[,;]/g,m=>'\\'+m);
export function monthlyCampaignPlan({year,month,shop,product,category='beauty'}={}){
 if(!Number.isInteger(year)||year<2026||year>2100||!Number.isInteger(month)||month<1||month>12||
 typeof shop!=='string'||!clean(shop,60)||typeof product!=='string'||!clean(product,80))
 throw new TypeError('CALENDAR_INVALID');
 const sector=['beauty','fashion','jewelry','food','home'].includes(category)?category:'home';
 const suggestions={
  beauty:['Presenta un beneficio real','Consejos de uso','Destaca un ingrediente','Invita a pedir información'],
  fashion:['Muestra una combinación','Explica tallas y medidas','Destaca una prenda','Invita a descubrir la colección'],
  jewelry:['Presenta una pieza','Cuenta cómo cuidarla','Muestra un detalle','Comparte ideas para regalar'],
  food:['Presenta un producto','Muestra sus ingredientes','Comparte una ocasión de consumo','Invita a consultar disponibilidad'],
  home:['Presenta un artículo','Muestra cómo se usa','Comparte un consejo útil','Invita a conocer más']
 }[sector];
 const title=clean(shop,60),item=clean(product,80);
 return Object.freeze([1,8,15,22].map((d,i)=>Object.freeze({
  date:day(year,month,d),
  title:suggestions[i],
  description:suggestions[i]+' de '+item+' en '+title+'. Verifica precio y disponibilidad antes de publicar.'
 })));
}
export function campaignCalendarIcs(options){
 const entries=monthlyCampaignPlan(options);
 const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//PromoFlash//Calendario Pro MX//ES','CALSCALE:GREGORIAN','METHOD:PUBLISH'];
 entries.forEach((item,index)=>{
  const start=item.date;
  const next=new Date(Date.UTC(Number(start.slice(0,4)),Number(start.slice(4,6))-1,Number(start.slice(6,8))+1));
  const end=day(next.getUTCFullYear(),next.getUTCMonth()+1,next.getUTCDate());
  lines.push('BEGIN:VEVENT','UID:'+start+'-'+index+'@promoflash.sequeidaulabs.com',
   'DTSTART;VALUE=DATE:'+start,'DTEND;VALUE=DATE:'+end,
   'SUMMARY:'+ics(item.title),'DESCRIPTION:'+ics(item.description),'END:VEVENT');
 });
 return lines.concat(['END:VCALENDAR','']).join('\r\n');
}
