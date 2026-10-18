from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from functools import partial
from threading import Thread
from playwright.sync_api import sync_playwright
import json
root=Path(__file__).parent
server=ThreadingHTTPServer(('127.0.0.1', 0),partial(SimpleHTTPRequestHandler,directory=str(root)))
Thread(target=server.serve_forever,daemon=True).start()
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for label,width,height in [('desktop',1440,900),('mobile',390,844)]:
  page=browser.new_page(viewport={'width':width,'height':height},device_scale_factor=1)
  errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.set_content((root/'index.html').read_text(),wait_until='load')
  page.wait_for_timeout(500)
  print(label,'Title:',page.title(),'images loaded:',page.locator('img[data-demo]').count(), 'natural widths',page.locator('img[data-demo]').evaluate_all('(es) => es.map(x=>x.naturalWidth)'), 'JS errors',errors)
  print('visible CTA:',page.locator('a[data-event="hero_demo"]').is_visible(),'horizontal overflow',page.evaluate('document.documentElement.scrollWidth > innerWidth'))
  page.screenshot(path=str(root/f'preview_{label}.png'),full_page=False)
  page.screenshot(path=str(root/f'preview_full_{label}.png'),full_page=True)
  page.close()
 browser.close()
server.shutdown()
