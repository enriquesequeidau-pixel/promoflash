import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';

test('Render preview includes all account Auth, CAPTCHA and brand dependencies',()=>{
 const blueprint=readFileSync('render.yaml','utf8');
 const build=blueprint.match(/^\s+buildCommand:\s*(.+)$/m)?.[1];
 assert.ok(build,'missing Render buildCommand');
 const copy=build.match(/\bcp\s+(.+)\s+dist\/\s*$/);
 assert.ok(copy,'missing allowlisted copy to dist');
 assert.match(blueprint,/autoDeployTrigger:\s*off/,'Preview must not deploy automatically');
 assert.doesNotMatch(build,/[;|`$]|\$\(|\b(?:curl|wget|chmod|rm|mv)\b/,'Build should remain a simple static allowlist');
 const files=copy[1].trim().split(/\s+/);
 assert.equal(new Set(files).size,files.length,'Duplicate build assets are not expected');
 const required=['index.html','landing.css','landing.js','editor.html','editor.css','editor.js','analytics-editor.js','cuenta.html','cuenta.js','config.js','privacidad.html','terminos.html','auth-captcha.mjs','auth-storage.mjs','brand.css','brand-mark.png','brand-symbol.svg'];
 for(const p of required){
   assert.ok(files.includes(p),'Unpublished required preview dependency: '+p);
   assert.ok(existsSync(p),'Missing repository asset: '+p);
 }
 const account=readFileSync('cuenta.js','utf8');
 const html=readFileSync('cuenta.html','utf8');
 assert.match(account,/from '\.\/auth-captcha\.mjs'/);
 assert.match(account,/from '\.\/auth-storage\.mjs'/);
 assert.match(html,/href="brand\.css\?v=/);
 assert.match(html,/src="brand-mark\.png"/);
 assert.match(blueprint,/https:\/\/challenges\.cloudflare\.com/);
 assert.match(blueprint,/frame-src https:\/\/challenges\.cloudflare\.com/);
 for(const privateName of ['.env','.git','private','commerce','service_role','supabase_secret'])assert.ok(!files.some(f=>f.includes(privateName)),'Never publish server-owned content: '+privateName);
 const config=readFileSync('config.js','utf8');
 assert.match(config,/proPaymentsEnabled:\s*false/,'PromoFlash Pro must remain disabled in non-commercial preview');
});
