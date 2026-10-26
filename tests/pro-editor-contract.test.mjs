import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const html=readFileSync(new URL("../editor.html",import.meta.url),"utf8");
const script=readFileSync(new URL("../editor-pro.mjs",import.meta.url),"utf8");
const config=readFileSync(new URL("../config.js",import.meta.url),"utf8");
test("integra solo panel Pro opcional con soporte de autenticación",()=>{
 for(const fragment of ['id="pfProStatus"','id="pfProActions" hidden','id="pfProGenerate"','src="editor-pro.mjs"'])assert.ok(html.includes(fragment));
 assert.ok(script.includes("promoflash-pro-studio"));
 assert.ok(script.includes("pro_entitlements"));
 assert.ok(script.includes("active!==true"));
});
test("nueve estilos Free, tres formatos y cobro off se conservan",()=>{
 for(const id of ['id="photo"','id="generate"','id="downloadAll"','id="categoryGrid"'])assert.ok(html.includes(id));
 for(const type of ['data-format="story"','data-format="post"','data-format="square"'])assert.ok(html.includes(type));
 assert.match(config,/proPaymentsEnabled:\s*false/);
 assert.doesNotMatch(script,/checkout_url|createPayment|proPaymentsEnabled\s*=\s*true/);
});
test("no concede Pro en el navegador ni mezcla almacenamiento entre apps",()=>{
 assert.ok(script.includes("tabScopedAuthStorage"));
 assert.ok(script.includes("sequeidaulabs-promoflash-auth-v1"));
 assert.ok(script.includes("current.data.user?.id!==userId"));
 assert.ok(script.includes("credentials:\"omit\""));
});

test("Anonymous Free never boots the Supabase SDK or fetches its CDN",()=>{
 assert.doesNotMatch(script,/^\s*import\s+.*cdn\.jsdelivr\.net/m);
 assert.match(script,/if\(!hasExistingAccountSession\(\)\)/);
 assert.match(script,/await import\("https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js@2\.57\.0\/\+esm"\)/);
});
