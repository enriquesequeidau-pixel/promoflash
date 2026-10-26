import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mexicoKitKeys,mexicanSeasonalKit,whatsappSalesText,monthlyCampaignPlan,campaignCalendarIcs} from '../v2/pro-mexico-tools.mjs';
const editor=readFileSync(new URL('../editor.js',import.meta.url),'utf8');
const pro=readFileSync(new URL('../editor-pro.mjs',import.meta.url),'utf8');
const html=readFileSync(new URL('../editor.html',import.meta.url),'utf8');
test('cuatro packs estacionales seguros para el editor actual',()=>{
 assert.deepEqual(mexicoKitKeys,['buen_fin','muertos','navidad','clases']);
 for(const key of mexicoKitKeys){
  const kit=mexicanSeasonalKit(key);
  assert.ok(kit.headline.length<=42&&kit.subtitle.length<=70);
  assert.ok(kit.discount.length<=15&&kit.cta.length<=29);
  assert.ok(Object.isFrozen(kit));
 }
 assert.throws(()=>mexicanSeasonalKit('__proto__'),/KIT_INVALID/);
});
test('WhatsApp no usa HTML ni URLs de contacto',()=>{
 const copy=whatsappSalesText({shop:'Mi Tienda',product:'Flores',price:'$300 MXN',cta:'Contáctanos'});
 assert.match(copy,/Flores · \$300 MXN/);
 assert.match(copy,/Mi Tienda/);
 assert.ok(!/wa\.me|javascript:/i.test(copy));
 assert.throws(()=>whatsappSalesText({shop:'',product:''}));
});
test('calendario mensual construye 4 eventos de día completo en formato ICS',()=>{
 const items=monthlyCampaignPlan({year:2026,month:2,shop:'Tienda',product:'Collar',category:'jewelry'});
 assert.deepEqual(items.map(x=>x.date),['20260201','20260208','20260215','20260222']);
 const ics=campaignCalendarIcs({year:2026,month:2,shop:'Tienda',product:'Collar'});
 assert.equal((ics.match(/BEGIN:VEVENT/g)||[]).length,4);
 assert.match(ics,/DTEND;VALUE=DATE:20260223/);
 assert.match(ics,/END:VCALENDAR\r\n$/);
 assert.throws(()=>monthlyCampaignPlan({year:2026,month:13,shop:'x',product:'y'}));
});
test('exportar nueve restaura la vista Free y no sube fotografías',()=>{
 assert.match(editor,/async function exportNineLocal\(\)/);
 assert.match(editor,/for\(const format of \['story','post','square'\]\)/);
 assert.match(editor,/state\.format=previous;renderGallery\(\);exportingNine=false/);
 assert.match(editor,/downloadFile\(zip\(files\)/);
});
test('herramientas son opcionales, sesión y plan Pro se revalidan',()=>{
 for(const id of ['pfProApplySeason','pfProWhatsApp','pfProNine','pfProCalendar'])assert.ok(html.includes('id="'+id+'"'));
 assert.match(pro,/async function authenticatedForTool\(\)/);
 assert.match(pro,/await client\.auth\.getUser\(\)/);
 assert.match(pro,/select\("active"\)/);
 assert.match(pro,/if\(!\(await authenticatedForTool\(\)\)\)/);
 assert.doesNotMatch(pro,/fetch\([^)]*photo/i);
});
