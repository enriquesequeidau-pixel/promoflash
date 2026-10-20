"""Check mobile promo doesn't pan sideways; no changes to existing analytics."""
from pathlib import Path
import subprocess,time
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
server=subprocess.Popen(['python3','-m','http.server','8791','--bind','127.0.0.1'],cwd=root,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
try:
 time.sleep(1)
 with sync_playwright() as pw:
  browser=pw.chromium.launch(headless=True)
  for width in (360,375,390,430,1280):
   page=browser.new_page(viewport={'width':width,'height':820})
   r=page.goto('http://127.0.0.1:8791/',wait_until='domcontentloaded')
   assert r and r.status==200
   assert page.locator('h1').count()>=1
   page.mouse.move(min(180,width-30),300)
   page.mouse.wheel(800,0)
   page.wait_for_timeout(150)
   assert page.evaluate('window.scrollX')==0,('unexpected sideways pan',width)
   page.close()
   print('PASS mobile layout',width)
  browser.close()
finally:
 server.terminate();server.wait(timeout=8)
