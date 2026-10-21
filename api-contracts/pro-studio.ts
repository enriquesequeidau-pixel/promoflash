import {createClient} from "npm:@supabase/supabase-js@2.57.0";
const ORIGIN="https://promoflash.sequeidaulabs.com";
const out=(b:unknown,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{"Content-Type":"application/json","Access-Control-Allow-Origin":ORIGIN,"Access-Control-Allow-Methods":"POST,OPTIONS","Access-Control-Allow-Headers":"authorization,apikey,content-type","Cache-Control":"no-store"}});
const templates={cercano:["¡{shop} tiene algo especial!","Tu próximo favorito: {product}","Que no se te escape {product}"],elegante:["Descubre {product} en {shop}","Un detalle especial para ti","Presentamos {product}"],energetico:["¡WOW! {product} llegó","¿Ya viste {product}?","¡Tu próxima compra favorita!"]};
Deno.serve(async req=>{
if(req.method==="OPTIONS")return new Response(null,{status:204,headers:out({},200).headers});
if(req.method!=="POST")return out({error:"method_not_allowed"},405);
try{
 const jwt=(req.headers.get("authorization")||"").replace(/^Bearer\s+/i,"");
 const url=Deno.env.get("SUPABASE_URL")||"",anon=Deno.env.get("SUPABASE_ANON_KEY")||"",service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
 if(!jwt||!url||!anon||!service)return out({error:"auth_required"},401);
 const client=createClient(url,anon,{auth:{persistSession:false}});const {data:{user},error}=await client.auth.getUser(jwt);
 if(error||!user?.id)return out({error:"invalid_session"},401);
 const db=createClient(url,service,{auth:{persistSession:false}});
 const {data:ent}=await db.from("pro_entitlements").select("active").eq("user_id",user.id).maybeSingle();
 if(!ent?.active)return out({error:"pro_required"},403);
 const raw=await req.text();if(new TextEncoder().encode(raw).byteLength>4096)return out({error:"invalid_fields"},400);
 let input:any;try{input=JSON.parse(raw)}catch{return out({error:"invalid_fields"},400)}
 if(!input||typeof input!=="object"||Array.isArray(input)||Object.keys(input).some(k=>!["shop","product","voice"].includes(k))||typeof input.shop!=="string"||typeof input.product!=="string"||(input.voice!==undefined&&typeof input.voice!=="string"))return out({error:"invalid_fields"},400);
 const shop=input.shop.trim().slice(0,60),product=input.product.trim().slice(0,65),voice=input.voice??"cercano";
 if(!shop||!product||!Object.hasOwn(templates,voice))return out({error:"invalid_fields"},400);
 const {error:save}=await db.from("pro_brand_kits").upsert({user_id:user.id,shop_name:shop,brand_voice:voice,category:"beauty",updated_at:new Date().toISOString()},{onConflict:"user_id"});
 if(save)return out({error:"save_failed"},503);
 const lines=templates[voice as keyof typeof templates].map(x=>x.replaceAll("{shop}",shop).replaceAll("{product}",product));
 return out({brand_saved:true,headlines:lines,cta:["Ver producto","Pedir ahora","Escríbenos hoy"]});
}catch{return out({error:"request_failed"},500)}
});