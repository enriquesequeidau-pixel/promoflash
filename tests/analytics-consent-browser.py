"""PromoFlash: optional analytics must be opt-in, reversible and confined to this app.

Uses mocked Meta and Supabase requests; no real user accounts, ads or traffic.
"""
from pathlib import Path
import subprocess,time
from playwright.sync_api import sync_playwright, expect

ROOT=Path(__file__).resolve().parents[1]
server=subprocess.Popen(['python3','-m','http.server','8776','--bind','127.0.0.1'],cwd=ROOT,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
try:
 time.sleep(1)
 with sync_playwright() as playwright:
  browser=playwright.chromium.launch(headless=True)
  for width in (375,1280):
   context=browser.new_context(viewport={'width':width,'height':850})
   page=context.new_page()
   pixels=[]
   events=[]
   page.route('**/connect.facebook.net/**',lambda route:(pixels.append(route.request.url),route.fulfill(status=200,content_type='text/javascript',body='')))
   page.route('**/functions/v1/promoflash-events',lambda route:(events.append(route.request.url),route.fulfill(status=202,content_type='application/json',headers={'Access-Control-Allow-Origin':'*'},body='{"accepted":true}')))
   page.goto('http://127.0.0.1:8776/index.html',wait_until='load')
   choice=page.locator('#analyticsPreference')
   expect(choice).to_be_visible()
   expect(choice).to_have_text('Permitir estadísticas')
   assert page.evaluate('localStorage.getItem("promoflash_analytics_choice")') is None
   assert not pixels and not events,(pixels,events)
   choice.click()
   expect(page.locator('#analyticsPreference')).to_have_text('Desactivar estadísticas')
   page.wait_for_timeout(500)
   assert len(pixels)>=1,'Consent should activate existing Meta Pixel'
   assert len(events)>=1,'Consent should allow first-party analytics'
   assert page.evaluate('localStorage.getItem("promoflash_analytics_choice")')=='yes'
   choice=page.locator('#analyticsPreference')
   choice.click()
   expect(page.locator('#analyticsPreference')).to_have_text('Permitir estadísticas')
   count=len(pixels)
   page.reload(wait_until='load')
   page.wait_for_timeout(400)
   assert len(pixels)==count,'Revocation must stop loading Meta on later page visits'
   assert page.evaluate('localStorage.getItem("promoflash_analytics_choice")')=='no'
   if page.evaluate('document.documentElement.scrollWidth>window.innerWidth+1'):
    diagnostics=page.evaluate("""() => ({screen: innerWidth, scroll:document.documentElement.scrollWidth,
      offenders:[...document.querySelectorAll('*')].filter(e=>{const r=e.getBoundingClientRect();return r.right>innerWidth+3||r.left<-3})
        .slice(0,12).map(e=>({tag:e.tagName,id:e.id,cls:e.className?.toString().slice(0,90),right:Math.round(e.getBoundingClientRect().right)}))})""")
    raise AssertionError(f'Mobile horizontal overflow: {diagnostics}')
   context.close()
   print(f'PASS: width={width} default off / consent on / revoke off / no mobile overflow')
  browser.close()
finally:
 server.terminate()
 server.wait(timeout=8)
