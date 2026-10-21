"""Check mobile promo doesn't pan sideways; no changes to existing analytics."""
from pathlib import Path
import subprocess,time
from playwright.sync_api import sync_playwright,expect
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
  # Browser upload safeguards: verify malformed bytes, oversized files, and
  # correctly encoded PNGs with excessive pixel dimensions are refused.
  import struct,zlib
  def png(w,h):
   def chunk(kind,data):
    return struct.pack('>I',len(data))+kind+data+struct.pack('>I',zlib.crc32(kind+data)&0xffffffff)
   raw=b'\\x00'+b'\\xff\\x00\\x00\\xff'*w
   compressor=zlib.compressobj(6)
   compressed=b''.join(compressor.compress(raw) for _ in range(h))+compressor.flush()
   return b'\\x89PNG\\r\\n\\x1a\\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',w,h,8,6,0,0,0))+chunk(b'IDAT',compressed)+chunk(b'IEND',b'')
  page=browser.new_page(viewport={'width':390,'height':844})
  errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  r=page.goto('http://127.0.0.1:8791/editor.html',wait_until='load')
  assert r and r.status==200
  page.locator('#resultGallery canvas').first.wait_for()
  page.locator('#productName').fill('<img src=x onerror=window.__pf_xss=1>')
  assert page.evaluate('window.__pf_xss === undefined')
  assert page.locator('img[src="x"]').count()==0
  upload=page.locator('#photo')
  upload.set_input_files({'name':'fake.png','mimeType':'image/png','buffer':b'not-an-image'})
  expect(page.locator('#uploadError')).to_contain_text('No se pudo abrir')
  upload.set_input_files({'name':'over-limit.png','mimeType':'image/png','buffer':b'0'*(12*1024*1024+1)})
  expect(page.locator('#uploadError')).to_contain_text('12 MB')
  upload.set_input_files({'name':'huge-dimensions.png','mimeType':'image/png','buffer':png(6101,10)})
  expect(page.locator('#uploadError')).to_contain_text('dimensiones demasiado grandes')
  assert not errors,errors
  page.close()
  print('PASS editor malicious text and file upload safeguards')
  browser.close()
finally:
 server.terminate();server.wait(timeout=8)
