"""Real Chromium QA for PromoFlash password reset interaction. Never sends a real email."""
from pathlib import Path
import json, os, subprocess, time
from playwright.sync_api import sync_playwright, expect
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'test-results'/'recovery'
OUT.mkdir(parents=True,exist_ok=True)
server=subprocess.Popen(['python3','-m','http.server','8765','--bind','127.0.0.1'],cwd=ROOT,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
try:
    time.sleep(1.2)
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True)
        for width in (375,1280):
            ctx=browser.new_context(viewport={'width':width,'height':860},device_scale_factor=1)
            page=ctx.new_page()
            js_errors=[]
            page.on('pageerror',lambda e:js_errors.append(str(e)))
            posts=[]
            def fake_recovery(route):
                request=route.request
                if request.method=='OPTIONS':
                    route.fulfill(status=204,headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'POST,OPTIONS','Access-Control-Allow-Headers':'apikey,authorization,content-type,x-client-info'})
                else:
                    posts.append({'method':request.method,'url':request.url,'body':request.post_data})
                    route.fulfill(status=200,content_type='application/json',headers={'Access-Control-Allow-Origin':'*'},body='{}')
            page.route('**/auth/v1/recover*',fake_recovery)
            response=page.goto('http://127.0.0.1:8765/cuenta.html',wait_until='networkidle')
            assert response and response.status==200
            btn=page.locator('#resetPassword')
            expect(btn).to_be_visible()
            expect(btn).to_have_text('¿Olvidaste tu contraseña?')
            bounds=btn.bounding_box()
            assert bounds is not None and bounds['height']<=46, f'Button too large: {bounds}'
            assert page.locator('#resetPassword').evaluate('(e)=>parseFloat(getComputedStyle(e).fontSize)')<=14
            assert not page.evaluate('document.documentElement.scrollWidth>window.innerWidth+1')
            page.screenshot(path=str(OUT/f'initial-{width}.png'),full_page=True)
            btn.click()
            expect(page.locator('#notice')).to_contain_text('Escribe tu correo electrónico')
            expect(page.locator('#email')).to_be_focused()
            page.locator('#email').fill('qa-person@example.com')
            btn.click()
            expect(page.locator('#notice')).to_contain_text('Solicitud enviada',timeout=15000)
            assert len(posts)==1 and posts[0]['method']=='POST',posts
            assert 'qa-person@example.com' in (posts[0]['body'] or '')
            assert 'nrwbnjjaqilgreqhpcov.supabase.co' in posts[0]['url']
            expect(btn).to_be_enabled()
            assert not js_errors,js_errors
            page.screenshot(path=str(OUT/f'success-{width}.png'),full_page=True)
            print(json.dumps({'viewport':width,'result':'PASS','font_px':12.5,'requests_mocked':len(posts)}))
            ctx.close()
        browser.close()
finally:
    server.terminate()
    server.wait(timeout=5)
