/* PromoFlash Studio v0.6 — no external services required for design and downloads */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const categoryNames = { beauty: 'Belleza', fashion: 'Moda', jewelry: 'Joyas', food: 'Comida', home: 'Hogar' };
  const examples = {
    beauty: { productName:'Glow Serum Facial', price:'$299 MXN', oldPrice:'$399', brand:'LUNA BEAUTY', discount:'-25%', headline:'TU RUTINA, MÁS LINDA', subtitle:'Tu momento glow comienza hoy', cta:'QUIERO EL MÍO →' },
    fashion: { productName:'Blusa Alba', price:'$449 MXN', oldPrice:'$599', brand:'MÍA CONCEPT', discount:'-25%', headline:'ESTILO QUE SE NOTA', subtitle:'Tu look favorito empieza aquí', cta:'QUIERO LA MÍA →' },
    jewelry: { productName:'Aros Golden Hour', price:'$349 MXN', oldPrice:'$469', brand:'ALMA JOYAS', discount:'-25%', headline:'DETALLES QUE BRILLAN', subtitle:'Pequeños detalles, grandes momentos', cta:'LOS QUIERO →' },
    food: { productName:'Box de Brownies', price:'$189 MXN', oldPrice:'$250', brand:'DULCE CLUB', discount:'-24%', headline:'DATE UN GUSTITO', subtitle:'Hechos con amor, para compartir', cta:'ORDENA HOY →' },
    home: { productName:'Vela Aura Lavanda', price:'$229 MXN', oldPrice:'$299', brand:'CASA BONITA', discount:'-23%', headline:'HAZ HOGAR', subtitle:'Detalles que transforman tus espacios', cta:'LA QUIERO →' }
  };
  const offers = {
    sale: ['TU NUEVA OFERTA FAVORITA', 'Precio especial por tiempo limitado', 'APROVECHA HOY →'],
    new: ['ACABA DE LLEGAR', 'Tu próxima obsesión ya está aquí', 'DESCÚBRELO →'],
    pack: ['EL PACK QUE NECESITAS', 'Más de lo que te gusta, en un solo lugar', 'QUIERO EL PACK →'],
    limited: ['¡SE ESTÁ AGOTANDO!', 'Disponible por unidades limitadas', 'LO QUIERO YA →']
  };
  const themes = {
    pop: {name:'Oferta que destaca', description:'Color y precio que se hacen notar', colors:['#FDE667','#F9A36D','#20243F','#FF4D70','#FEFEF4']},
    editorial: {name:'Editorial chic', description:'Minimalismo con toque premium', colors:['#F6EFE2','#E7D8C4','#24201E','#A97557','#FCF8F0']},
    noir: {name:'Luxe nocturno', description:'Un look sofisticado y elegante', colors:['#141E26','#2B3640','#FFF2DB','#CBA374','#222D37']},
    catalog: {name:'Catálogo limpio', description:'Producto claro, oferta clara', colors:['#F7F8FC','#E6E9F2','#232841','#596BDB','#FFFFFF']},
    soft: {name:'Pastel mood', description:'Delicado, cálido y moderno', colors:['#F6DBE8','#F8F5FB','#3C2D4A','#FF6F93','#FFFFFF']},
    neon: {name:'Neon drop', description:'Energía y actitud para destacar', colors:['#32236D','#EC4E92','#FFFFFF','#DCFF6B','#493D91']},
    citrus: {name:'Fresh market', description:'Fresco, orgánico y auténtico', colors:['#DAF6B2','#B8E5B8','#253D2F','#F86D50','#F4FFE5']},
    market: {name:'Precio estrella', description:'Ideal para promos irresistibles', colors:['#2F53A4','#7095FF','#FFFFFF','#FDED67','#26458B']},
    bloom: {name:'Bloom studio', description:'Editorial suave y muy compartible', colors:['#F7EEE8','#DFC8D5','#423546','#C8657E','#FFFCF8']}
  };
  const categoryThemes = {
    beauty:['soft','editorial','pop','bloom','neon','catalog','noir','citrus','market'],
    fashion:['editorial','neon','catalog','pop','noir','bloom','market','soft','citrus'],
    jewelry:['noir','bloom','editorial','catalog','pop','soft','neon','citrus','market'],
    food:['pop','citrus','market','soft','editorial','catalog','neon','bloom','noir'],
    home:['bloom','citrus','catalog','editorial','soft','noir','pop','market','neon']
  };
  const formats = {story:[1080,1920],post:[1080,1350],square:[1080,1080]};
  const state = {category:'beauty', format:'story', batch:0, image:null, photoUrl:null};
  let debounce=null;
  const localKey = 'promoflash_studio_v06';
  function track(name,props={}) {if(typeof window.PROMOFLASH_TRACK==='function')window.PROMOFLASH_TRACK(name,props);}
  function readInputs(){const get = id => $(id).value.trim(); return { category:state.category, name:get('productName')||'Tu producto', price:get('price')||'$0', oldPrice:get('oldPrice'), brand:get('brand')||'MI TIENDA', discount:get('discount'), headline:get('headline')||'OFERTA ESPECIAL', subtitle:get('subtitle'), cta:get('cta')||'LO QUIERO →', contain:$('containPhoto').checked };}
  function save(){try{localStorage.setItem(localKey,JSON.stringify({category:state.category, values:readInputs()}));}catch(e){}}
  function restore(){try{const data=JSON.parse(localStorage.getItem(localKey)); if(data && examples[data.category]){state.category=data.category;const v=data.values||{}; Object.keys(examples.beauty).forEach(k=>{if(typeof v[k]==='string' && $(k)) $(k).value=v[k]});$('containPhoto').checked=!!v.contain;}}catch(e){}}
  function setCategory(next,loadExample=true){state.category=next;state.batch=0;document.querySelectorAll('.category').forEach(btn=>{const active=btn.dataset.category===next;btn.classList.toggle('active',active);btn.setAttribute('aria-pressed',String(active));});if(loadExample){Object.entries(examples[next]).forEach(([k,v])=>$(k).value=v);$('promoType').value='sale';}renderGallery();save();track('select_category',{category:next});}
  function update(){clearTimeout(debounce);debounce=setTimeout(()=>{renderGallery();save();},85);}
  function randRoundRect(ctx,x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r);}
  function fill(ctx,x,y,w,h,r,color){ctx.save();ctx.fillStyle=color;randRoundRect(ctx,x,y,w,h,r);ctx.fill();ctx.restore();}
  function gradient(ctx,w,h,a,b,direction='vertical'){const g=direction==='vertical'?ctx.createLinearGradient(0,0,0,h):ctx.createLinearGradient(0,0,w,h);g.addColorStop(0,a);g.addColorStop(1,b);ctx.fillStyle=g;ctx.fillRect(0,0,w,h);}
  function txt(ctx,text,x,y,size,color,weight=800,align='left',maxWidth=950,font='Inter,system-ui,Arial,sans-serif') {ctx.save();ctx.font=`${weight} ${size}px ${font}`;ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillStyle=color;ctx.fillText(String(text),x,y,maxWidth);ctx.restore();}
  function wordWrap(ctx,text,x,y,width,fontSize,color,opts={}) {let weight=opts.weight||900,max=opts.lines||2,lineH=opts.lineH||fontSize*1.02,align=opts.align||'left',family=opts.font||'Inter,system-ui,Arial,sans-serif';ctx.save();ctx.font=`${weight} ${fontSize}px ${family}`;let chunks=[],line='';for(let w of String(text).trim().split(/\s+/)){let next=line?line+' '+w:w;if(ctx.measureText(next).width>width && line){chunks.push(line);line=w}else line=next;}if(line)chunks.push(line);ctx.restore();chunks.slice(0,max).forEach((line,i)=>txt(ctx,line,x,y+i*lineH,fontSize,color,weight,align,width,family));return Math.min(chunks.length,max);}
  function circle(ctx,x,y,r,color){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();}
  function imageTile(ctx,x,y,w,h,r,v,back='#F4EFEA'){ ctx.save();randRoundRect(ctx,x,y,w,h,r);ctx.clip();ctx.fillStyle=back;ctx.fillRect(x,y,w,h);if(state.image){const im=state.image;if(v.contain){const s=Math.min((w-24)/im.width,(h-24)/im.height);const ww=im.width*s,hh=im.height*s;ctx.drawImage(im,x+(w-ww)/2,y+(h-hh)/2,ww,hh);}else{const s=Math.max(w/im.width,h/im.height),ww=im.width*s,hh=im.height*s;ctx.drawImage(im,x+(w-ww)/2,y+(h-hh)/2,ww,hh);}}else {drawDemo(ctx,x,y,w,h,v.category);}ctx.restore();}
  function drawDemo(ctx,x,y,w,h,cat){ // Built-in vector samples, not stock photos.
    ctx.save();ctx.translate(x,y);ctx.scale(w/600,h/670);
    const g=ctx.createLinearGradient(0,0,600,670);g.addColorStop(0,cat==='beauty'?'#ffefdf':cat==='fashion'?'#dfecf2':cat==='food'?'#ffe6d6':cat==='jewelry'?'#e4dacb':'#ece8d9');g.addColorStop(1,cat==='beauty'?'#f0c5be':cat==='fashion'?'#aacad0':cat==='food'?'#ffcba2':cat==='jewelry'?'#ceb9a2':'#d7d0b9');ctx.fillStyle=g;ctx.fillRect(0,0,600,670);
    circle(ctx,490,140,210,'rgba(255,255,255,.27)');circle(ctx,70,550,220,'rgba(255,255,255,.17)');
    ctx.save();ctx.shadowColor='rgba(68,34,34,.28)';ctx.shadowBlur=45;ctx.shadowOffsetY=24;
    if(cat==='beauty'){
      const body=ctx.createLinearGradient(195,0,405,0);body.addColorStop(0,'#c97861');body.addColorStop(.35,'#edc0a5');body.addColorStop(.7,'#d99984');body.addColorStop(1,'#b76b58');fill(ctx,226,194,148,344,22,body);fill(ctx,250,140,100,70,9,'#272b33');fill(ctx,262,111,75,54,5,'#1a232b');fill(ctx,240,293,119,158,3,'#fff8eb');txt(ctx,'LUNA',300,336,26,'#8c665e',800,'center',115);txt(ctx,'GLOW',300,375,27,'#c0807d',950,'center',115);txt(ctx,'SERUM',300,410,19,'#a18c83',650,'center',110);circle(ctx,305,485,12,'rgba(255,255,255,.6)');
    } else if(cat==='fashion'){
      ctx.fillStyle='#ecf0f0';ctx.beginPath();ctx.moveTo(205,185);ctx.lineTo(140,225);ctx.lineTo(70,360);ctx.lineTo(180,405);ctx.lineTo(210,350);ctx.lineTo(210,548);ctx.lineTo(385,548);ctx.lineTo(385,350);ctx.lineTo(420,405);ctx.lineTo(528,356);ctx.lineTo(456,226);ctx.lineTo(382,187);ctx.quadraticCurveTo(300,260,205,185);ctx.fill();ctx.fillStyle='#d4e0de';ctx.beginPath();ctx.ellipse(300,205,56,24,0,0,Math.PI*2);ctx.fill();txt(ctx,'MÍA',300,385,45,'#819999',900,'center',125);ctx.strokeStyle='#c6d9d6';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(212,340);ctx.lineTo(212,545);ctx.stroke();
    } else if(cat==='jewelry'){
      for(let n of [-1,1]){const ox=300+n*113;ctx.save();ctx.lineWidth=16;ctx.strokeStyle='#d7ad58';ctx.shadowColor='#bd9139';ctx.shadowBlur=22;ctx.beginPath();ctx.ellipse(ox,330,78,149,n*.05,0,Math.PI*2);ctx.stroke();ctx.restore();circle(ctx,ox,175,17,'#f6e5ab');circle(ctx,ox,472,18,'#f6d98b');}
    } else if(cat==='food'){
      fill(ctx,166,372,267,150,40,'#875042');fill(ctx,170,344,260,110,44,'#5b372e');fill(ctx,194,286,215,100,40,'#663f39');ctx.fillStyle='#b57969';for(let i=0;i<22;i++){circle(ctx,205+(i*43)%190,312+((i*31)%80),6,'#e8b091')}fill(ctx,180,464,250,45,15,'#f7d7b5');
    } else if(cat==='home'){
      fill(ctx,180,245,235,290,37,'#efe2c5');fill(ctx,182,243,231,30,10,'#f8f0e0');fill(ctx,190,350,212,125,11,'#fff8e9');txt(ctx,'CASA',295,385,27,'#9e9688',900,'center',180);txt(ctx,'AURA',295,422,36,'#655f57',850,'center',180);fill(ctx,195,520,200,17,4,'#b8aa8d');ctx.fillStyle='#986d4f';ctx.fillRect(292,204,5,40);ctx.save();ctx.shadowBlur=20;ctx.shadowColor='#ffb43c';ctx.fillStyle='#fdbb55';ctx.beginPath();ctx.ellipse(295,188,16,26,0,0,Math.PI*2);ctx.fill();ctx.restore();
    }
    ctx.restore();ctx.restore();}
  function badge(ctx,s,x,y,bg,fg,w=190,h=70){fill(ctx,x,y,w,h,h/2,bg);txt(ctx,s,x+w/2,y+h/2,Math.min(31,h*.48),fg,950,'center',w-24);}
  function curvy(ctx,w,h,color,alpha=.15){ctx.save();ctx.globalAlpha=alpha;ctx.strokeStyle=color;ctx.lineWidth=5;for(let i=0;i<9;i++){ctx.beginPath();ctx.arc(w*1.10,-70,185+i*67,0,Math.PI*2);ctx.stroke();}ctx.restore();}
  function baseline(ctx,v,H,theme,format){txt(ctx,v.brand.toUpperCase(),78,84,27,theme,850);}
  function drawPop(ctx,w,h,v,c){ gradient(ctx,w,h,c[0],c[1]);curvy(ctx,w,h,'#fff',.22);const small=h<1400;badge(ctx,v.discount||'OFERTA',w-295,74,c[3],'#fff',220,82);txt(ctx,'✳ '+v.brand.toUpperCase(),74,105,28,c[2],950,'left',650);wordWrap(ctx,v.headline.toUpperCase(),74,218,920,small?49:62,c[2],{weight:950,lines:2});const top=h*.295,ph=h*.38;imageTile(ctx,74,top,w-148,ph,44,v,c[4]);fill(ctx,92,top+ph-6,w-184,30,0,c[3]);txt(ctx,v.name,77,top+ph+95,small?53:70,c[2],950,'left',900);txt(ctx,v.price,77,top+ph+(small?167:192),small?90:123,c[2],950,'left',900);if(v.oldPrice)txt(ctx,'ANTES '+v.oldPrice,80,top+ph+(small?221:262),26,c[2],600);fill(ctx,72,h-171,w-144,96,23,c[2]);txt(ctx,v.cta,w/2,h-123,40,'#fff',900,'center',850);}
  function drawEditorial(ctx,w,h,v,c){gradient(ctx,w,h,c[0],c[1]);fill(ctx,64,62,w-128,h-124,26,c[4]);badge(ctx,'EDICIÓN ESPECIAL',92,94,c[3],'#fff',330,65);txt(ctx,v.brand.toUpperCase(),w-100,126,23,c[2],800,'right',350);wordWrap(ctx,v.name,96,226,875,h<1400?64:76,c[2],{weight:700,lines:2,font:'Georgia,serif',lineH:82});txt(ctx,v.subtitle,97,368,30,c[3],500,'left',860,'Georgia,serif');const top=h*.30;imageTile(ctx,94,top,w-188,h*.36,16,v,c[0]);txt(ctx,v.headline.toUpperCase(),96,top+h*.36+66,32,c[3],900,'left',850);txt(ctx,v.price,96,top+h*.36+160,h<1400?82:116,c[2],650,'left',800,'Georgia,serif');if(v.oldPrice)txt(ctx,'antes '+v.oldPrice,w-105,top+h*.36+155,28,c[3],500,'right');fill(ctx,96,h-161,w-192,84,16,c[2]);txt(ctx,v.cta,w/2,h-120,36,c[4],850,'center',780);}
  function drawNoir(ctx,w,h,v,c){gradient(ctx,w,h,c[0],c[1]);curvy(ctx,w,h,'#c8a16c',.14);txt(ctx,'✧ '+v.brand.toUpperCase()+' ✧',w/2,96,25,c[3],750,'center',900);txt(ctx,v.headline.toUpperCase(),w/2,183,39,c[2],900,'center',850);wordWrap(ctx,v.name,w/2,280,930,h<1400?67:83,c[2],{align:'center',lines:2,font:'Georgia,serif',weight:600,lineH:88});const top=h*.30;fill(ctx,76,top-12,w-152,h*.37+24,42,'#6a573d');imageTile(ctx,88,top,w-176,h*.37,34,v,c[4]);if(v.discount)badge(ctx,v.discount,109,top+25,c[3],c[0],208,76);txt(ctx,v.price,w/2,top+h*.37+142,h<1400?82:112,c[2],800,'center',910,'Georgia,serif');if(v.oldPrice)txt(ctx,'ANTES '+v.oldPrice,w/2,top+h*.37+215,25,c[3],750,'center');fill(ctx,114,h-176,w-228,86,17,c[3]);txt(ctx,v.cta,w/2,h-132,35,c[0],900,'center',760);}
  function drawCatalog(ctx,w,h,v,c){gradient(ctx,w,h,c[0],c[1]);fill(ctx,68,66,w-136,h-132,35,c[4]);txt(ctx,v.brand.toUpperCase(),104,116,27,c[2],950);badge(ctx,v.discount||'NUEVO',w-335,92,c[3],'#fff',233,68);const top=h*.19;imageTile(ctx,97,top,w-194,h*.47,26,v,c[1]);txt(ctx,v.headline.toUpperCase(),102,top+h*.47+63,36,c[3],900,'left',840);wordWrap(ctx,v.name,102,top+h*.47+138,860,h<1400?53:70,c[2],{lines:2});txt(ctx,v.subtitle,102,top+h*.47+225,28,'#82899b',600,'left',850);fill(ctx,100,h-277,w-200,111,18,'#f3f5ff');txt(ctx,v.price,125,h-218,76,c[2],950,'left',700);if(v.oldPrice)txt(ctx,'Antes '+v.oldPrice,w-128,h-214,27,'#82899b',700,'right');fill(ctx,100,h-146,w-200,80,16,c[3]);txt(ctx,v.cta,w/2,h-104,32,'#fff',850,'center',780);}
  function drawSoft(ctx,w,h,v,c){gradient(ctx,w,h,c[0],c[1]);circle(ctx,920,220,270,'rgba(255,255,255,.35)');circle(ctx,150,h*.72,200,'rgba(255,255,255,.22)');txt(ctx,'✦ '+v.brand.toUpperCase(),85,100,27,c[2],900);badge(ctx,v.discount||'ESPECIAL',w-312,72,c[3],'#fff',230,72);wordWrap(ctx,v.name,85,220,840,h<1400?69:91,c[2],{lines:2,font:'Georgia,serif',weight:700,lineH:96});txt(ctx,v.headline.toUpperCase(),85,398,33,c[3],950,'left',850);const top=h*.32;fill(ctx,102,top,w-204,h*.36,48,'rgba(255,255,255,.82)');imageTile(ctx,123,top+20,w-246,h*.36-40,34,v,c[4]);txt(ctx,v.subtitle,86,top+h*.36+69,28,c[2],650,'left',890);txt(ctx,v.price,85,top+h*.36+160,h<1400?80:116,c[2],850,'left',910,'Georgia,serif');if(v.oldPrice)txt(ctx,'antes '+v.oldPrice,88,top+h*.36+219,27,c[3],650);fill(ctx,86,h-161,w-172,84,28,c[2]);txt(ctx,v.cta,w/2,h-119,34,'#fff',950,'center',800);}
  function drawNeon(ctx,w,h,v,c){gradient(ctx,w,h,c[0],c[1],'diagonal');curvy(ctx,w,h,c[3],.18);txt(ctx,v.brand.toUpperCase(),84,97,28,c[2],950);badge(ctx,v.discount||'NUEVO',w-329,71,c[3],c[0],244,82);wordWrap(ctx,v.headline.toUpperCase(),78,221,920,64,c[2],{weight:950,lines:2});const top=h*.29;fill(ctx,69,top-16,w-138,h*.4+31,40,c[4]);imageTile(ctx,85,top,w-170,h*.4,29,v,c[1]);fill(ctx,80,top+h*.4+45,w-160,83,20,c[3]);txt(ctx,v.name,w/2,top+h*.4+84,42,c[0],950,'center',855);txt(ctx,v.price,w/2,top+h*.4+201,h<1400?96:128,c[2],950,'center',900);txt(ctx,v.subtitle,w/2,h-219,27,c[2],600,'center',850);fill(ctx,80,h-167,w-160,98,28,'#fff');txt(ctx,v.cta,w/2,h-118,39,c[0],950,'center',790);}
  function drawCitrus(ctx,w,h,v,c){gradient(ctx,w,h,c[0],c[1]);for(let i=0;i<5;i++)circle(ctx,80+i*230,55,84,'rgba(255,255,255,.18)');txt(ctx,'✳ '+v.brand.toUpperCase(),85,102,29,c[2],950);wordWrap(ctx,v.headline.toUpperCase(),85,213,900,h<1400?54:66,c[2],{weight:950,lines:2});const top=h*.30;imageTile(ctx,85,top,w-170,h*.40,220,v,c[4]);badge(ctx,v.discount||'PROMO',w-321,top+25,c[3],'#fff',216,84);txt(ctx,v.name,84,top+h*.40+89,60,c[2],950,'left',920);txt(ctx,v.price,84,top+h*.40+179,h<1400?88:112,c[2],950,'left',890);if(v.oldPrice)txt(ctx,'ANTES '+v.oldPrice,88,top+h*.4+241,24,c[2],650);fill(ctx,83,h-164,w-166,93,22,c[2]);txt(ctx,v.cta,w/2,h-118,39,'#fff',950,'center',850);}
  function drawMarket(ctx,w,h,v,c){gradient(ctx,w,h,c[0],c[1]);curvy(ctx,w,h,'#fff',.22);txt(ctx,'☼ '+v.brand.toUpperCase(),78,92,28,c[2],950);badge(ctx,v.discount||'PROMO',w-295,62,c[3],c[0],220,92);txt(ctx,v.headline.toUpperCase(),83,219,59,c[2],950,'left',910);const top=h*.27;imageTile(ctx,82,top,w-164,h*.4,27,v,'#e9f3fa');fill(ctx,83,top+h*.4+28,w-166,140,22,c[3]);txt(ctx,v.name,106,top+h*.4+79,51,c[0],950,'left',800);txt(ctx,v.price,106,top+h*.4+137,72,c[0],950,'left',820);if(v.oldPrice)txt(ctx,'ANTES '+v.oldPrice,86,top+h*.4+210,27,c[2],750);txt(ctx,v.subtitle,86,h-236,26,c[2],600,'left',890);fill(ctx,82,h-179,w-164,93,23,c[2]);txt(ctx,v.cta,w/2,h-133,38,c[0],950,'center',820);}
  function drawBloom(ctx,w,h,v,c){gradient(ctx,w,h,c[0],c[1]);circle(ctx,w-50,h*.2,290,'rgba(255,255,255,.38)');txt(ctx,'✧ '+v.brand.toUpperCase(),87,104,28,c[2],850);wordWrap(ctx,v.name,88,213,900,h<1400?65:88,c[2],{weight:650,lines:2,font:'Georgia,serif',lineH:91});txt(ctx,v.headline.toUpperCase(),91,373,35,c[3],900,'left',870);const top=h*.31;imageTile(ctx,91,top,w-182,h*.41,43,v,c[4]);if(v.discount)badge(ctx,v.discount,94,top+30,c[3],'#fff',196,77);txt(ctx,v.subtitle,91,top+h*.41+65,29,c[2],600,'left',870);txt(ctx,v.price,91,top+h*.41+173,h<1400?86:117,c[2],700,'left',880,'Georgia,serif');if(v.oldPrice)txt(ctx,'ANTES '+v.oldPrice,91,top+h*.41+234,26,c[3],650);fill(ctx,91,h-171,w-182,92,23,c[2]);txt(ctx,v.cta,w/2,h-126,35,'#fff',900,'center',830);}
  const art={pop:drawPop,editorial:drawEditorial,noir:drawNoir,catalog:drawCatalog,soft:drawSoft,neon:drawNeon,citrus:drawCitrus,market:drawMarket,bloom:drawBloom};
  function drawCompact(ctx,w,h,v,style,c){
    gradient(ctx,w,h,c[0],c[1]);
    ctx.save();ctx.globalAlpha=.17;circle(ctx,970,55,220,c[4]);circle(ctx,120,h-50,240,c[4]);ctx.restore();
    const ink=c[2],accent=c[3],light=(style==='noir'||style==='neon'||style==='market')?'#fff':ink;
    if(style==='catalog'||style==='editorial'||style==='bloom')fill(ctx,35,35,w-70,h-70,28,c[4]);
    txt(ctx,'✳ '+v.brand.toUpperCase(),70,91,27,ink,900,'left',750);
    badge(ctx,v.discount||'OFERTA',w-290,57,accent,style==='neon'||style==='market'?c[0]:'#fff',205,73);
    wordWrap(ctx,v.headline.toUpperCase(),74,174,930,51,ink,{weight:950,lines:1});
    const y=250, ph=h-670;
    if(style==='neon'||style==='noir'){fill(ctx,61,y-11,w-122,ph+22,36,accent);imageTile(ctx,76,y,w-152,ph,28,v,c[4]);}
    else if(style==='soft'||style==='citrus'){imageTile(ctx,72,y,w-144,ph,190,v,c[4]);}
    else {imageTile(ctx,70,y,w-140,ph,24,v,c[4]);}
    txt(ctx,v.name,78,y+ph+65,57,ink,950,'left',910);
    txt(ctx,v.price,78,y+ph+139,84,ink,950,'left',940);
    if(v.oldPrice)txt(ctx,'ANTES '+v.oldPrice,80,y+ph+207,27,ink,700);
    fill(ctx,69,h-137,w-138,87,20,style==='market'?c[2]:style==='noir'?accent:style==='neon'?c[3]:accent);
    txt(ctx,v.cta,w/2,h-93,36,style==='noir'?c[0]:style==='neon'?c[0]:style==='market'?c[0]:'#fff',950,'center',840);
  }
  function renderCanvas(canvas,style,full=false){const [W,H]=formats[state.format],s=full?1:1/3;canvas.width=Math.round(W*s);canvas.height=Math.round(H*s);const ctx=canvas.getContext('2d',{alpha:false});ctx.setTransform(s,0,0,s,0,0);ctx.fillStyle='#fff';ctx.fillRect(0,0,W,H);const v=readInputs(),colors=themes[style].colors;if(H<1700)drawCompact(ctx,W,H,v,style,colors);else art[style](ctx,W,H,v,colors);}
  function selectedStyles(){const pool=categoryThemes[state.category],o=(state.batch*3)%pool.length;return [pool[o],pool[(o+1)%pool.length],pool[(o+2)%pool.length]];}
  function renderGallery(){const styles=selectedStyles();const gallery=$('resultGallery');const old=[...gallery.querySelectorAll('.design-card')];if(old.length!==3){gallery.replaceChildren();styles.forEach((theme,i)=>{const card=document.createElement('article');card.className='design-card';card.innerHTML=`<div class="design-preview"><span class="design-label">OPCIÓN ${i+1}</span><canvas aria-label="Vista previa de promoción"></canvas></div><div class="design-bottom"><strong></strong><p></p><button class="card-download" type="button">↓ Descargar esta</button></div>`;card.querySelector('button').addEventListener('click',()=>saveOne(card.dataset.style));gallery.appendChild(card);});}
    [...gallery.querySelectorAll('.design-card')].forEach((card,i)=>{const th=styles[i];card.dataset.style=th;card.querySelector('strong').textContent=themes[th].name;card.querySelector('p').textContent=themes[th].description;renderCanvas(card.querySelector('canvas'),th);});$('resultsNote').textContent=state.image?'Tus tres diseños están listos para descargar.':'Ejemplos ilustrativos: sube tu foto para personalizarlos.'; }
  function toBlob(style){const canvas=document.createElement('canvas');renderCanvas(canvas,style,true);return new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('No se pudo crear la imagen')),'image/png'));}
  function downloadFile(blob,name){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);}
  function safeName(name){return name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,30)||'promo';}
  async function saveOne(style){try{const b=await toBlob(style);downloadFile(b,`promoflash-${safeName(readInputs().name)}-${style}-${state.format}.png`);track('promo_download',{style,format:state.format,category:state.category});}catch(e){alert('No se pudo descargar la imagen. Vuelve a intentarlo.');}}
  function uint16(d,v,o){d[o]=v&255;d[o+1]=(v>>8)&255;}function uint32(d,v,o){d[o]=v&255;d[o+1]=(v>>8)&255;d[o+2]=(v>>16)&255;d[o+3]=(v>>24)&255;}
  const crcTable=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;crcTable[n]=c>>>0;}
  function crc32(u){let c=0xffffffff;for(let i=0;i<u.length;i++)c=crcTable[(c^u[i])&255]^(c>>>8);return(c^0xffffffff)>>>0;}
  function zip(files){const enc=new TextEncoder(),locals=[],centrals=[];let offset=0;for(const f of files){const name=enc.encode(f.name),data=f.data,crc=crc32(data),local=new Uint8Array(30+name.length),central=new Uint8Array(46+name.length);uint32(local,0x04034b50,0);uint16(local,20,4);uint16(local,0x0800,6);uint16(local,0,8);uint32(local,crc,14);uint32(local,data.length,18);uint32(local,data.length,22);uint16(local,name.length,26);local.set(name,30);uint32(central,0x02014b50,0);uint16(central,20,4);uint16(central,20,6);uint16(central,0x0800,8);uint16(central,0,10);uint32(central,crc,16);uint32(central,data.length,20);uint32(central,data.length,24);uint16(central,name.length,28);uint32(central,offset,42);central.set(name,46);locals.push(local,data);centrals.push(central);offset+=local.length+data.length;}
    const cdSize=centrals.reduce((s,x)=>s+x.length,0),end=new Uint8Array(22);uint32(end,0x06054b50,0);uint16(end,files.length,8);uint16(end,files.length,10);uint32(end,cdSize,12);uint32(end,offset,16);return new Blob([...locals,...centrals,end],{type:'application/zip'});}
  async function saveAll(){const button=$('downloadAll');button.disabled=true;button.textContent='Preparando tus 3 promos…';try{const items=await Promise.all(selectedStyles().map(async(style,i)=>({name:`promo-${i+1}-${style}-${state.format}.png`,data:new Uint8Array(await (await toBlob(style)).arrayBuffer())})));downloadFile(zip(items),`PromoFlash-${safeName(readInputs().name)}-3-promos.zip`);track('promo_download_all',{format:state.format,category:state.category});}catch(e){alert('No se pudo crear el ZIP. Prueba descargar los diseños por separado.');}finally{button.disabled=false;button.innerHTML='↓ Descargar las 3 gratis <span>ZIP</span>';}}
  function clearPhoto(){if(state.photoUrl)URL.revokeObjectURL(state.photoUrl);state.photoUrl=null;state.image=null;$('photo').value='';$('uploadLabel').textContent='Subir foto de mi producto';$('uploadError').textContent='';renderGallery();}
  function loadPhoto(file){$('uploadError').textContent='';if(!file)return;if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>12*1024*1024){$('uploadError').textContent='Usa una imagen JPG, PNG o WebP de hasta 12 MB.';return;}if(state.photoUrl)URL.revokeObjectURL(state.photoUrl);const url=URL.createObjectURL(file);const img=new Image();img.onload=()=>{if(!img.naturalWidth||!img.naturalHeight||img.naturalWidth>6000||img.naturalHeight>6000||img.naturalWidth*img.naturalHeight>18000000){URL.revokeObjectURL(url);$('uploadError').textContent='La fotografía tiene dimensiones demasiado grandes (máximo 18 megapíxeles).';return;}state.photoUrl=url;state.image=img;$('uploadLabel').textContent='✓ '+file.name.slice(0,35);renderGallery();track('photo_uploaded',{category:state.category});};img.onerror=()=>{URL.revokeObjectURL(url);$('uploadError').textContent='No se pudo abrir esa fotografía.'};img.src=url;}
  document.querySelectorAll('.category').forEach(btn=>btn.addEventListener('click',()=>setCategory(btn.dataset.category)));
  document.querySelectorAll('.format').forEach(btn=>btn.addEventListener('click',()=>{state.format=btn.dataset.format;document.querySelectorAll('.format').forEach(b=>{let active=b.dataset.format===state.format;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});renderGallery();}));
  for(const name of ['productName','price','oldPrice','brand','discount','headline','subtitle','cta','containPhoto'])$(name).addEventListener('input',update);
  $('promoType').addEventListener('change',e=>{const item=offers[e.target.value];$('headline').value=item[0];$('subtitle').value=item[1];$('cta').value=item[2];update();});
  $('photo').addEventListener('change',e=>loadPhoto(e.target.files?.[0]));
  const drop=$('dropZone');for(const ev of ['dragenter','dragover'])drop.addEventListener(ev,e=>{e.preventDefault();drop.style.background='#e8dfff';});for(const ev of ['dragleave','drop'])drop.addEventListener(ev,e=>{e.preventDefault();drop.style.background='';if(ev==='drop')loadPhoto(e.dataTransfer?.files?.[0]);});
  $('generate').addEventListener('click',()=>{state.batch=(state.batch+1)%3;renderGallery();document.getElementById('resultSection').scrollIntoView({behavior:'smooth',block:'start'});track('promo_generate',{category:state.category});});
  $('remix').addEventListener('click',()=>{state.batch=(state.batch+1)%3;renderGallery();track('promo_remix',{category:state.category});});
  $('downloadAll').addEventListener('click',saveAll);
  // The Pro UI requires a fresh account check before calling this convenience
  // export. Actual paid feature authorization and persistence live server-side.
  let exportingNine=false;
  async function exportNineLocal(){
    if(exportingNine)throw new Error('EXPORT_BUSY');
    exportingNine=true;
    const previous=state.format;
    try{
      const styles=selectedStyles(),files=[];
      for(const format of ['story','post','square']){
        state.format=format;
        for(const [index,style] of styles.entries()){
          const blob=await toBlob(style);
          files.push({name:`promo-${index+1}-${style}-${format}.png`,
            data:new Uint8Array(await blob.arrayBuffer())});
        }
      }
      downloadFile(zip(files),`PromoFlash-${safeName(readInputs().name)}-9-formatos-Pro.zip`);
      track('pro_nine_export',{count:files.length,category:state.category});
      return files.length;
    }finally{
      state.format=previous;renderGallery();exportingNine=false;
    }
  }
  restore();setCategory(state.category,false);
  window.PromoFlashDemo={render:(canvas,style)=>renderCanvas(canvas,style),
    selectedStyles,exportNineLocal,clearPhoto};
})();
