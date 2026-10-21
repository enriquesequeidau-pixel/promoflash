"""Live Cloudflare cutover checks. No real login, Meta event or payment is sent."""
from playwright.sync_api import sync_playwright, expect
from urllib.parse import urlparse

BASE="https://promoflash.sequeidaulabs.com"
PIXEL="2330854091059395"
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True)
 ctx=browser.new_context(viewport={"width":390,"height":844})
 page=ctx.new_page()
 errors=[]
 requested=[]
 page.on("pageerror",lambda e:errors.append(str(e)))
 def mock_pixel(route):
  requested.append(route.request.url)
  route.fulfill(status=200,content_type="application/javascript",headers={"Access-Control-Allow-Origin":"*"},body="/* blocked outbound test pixel; preserves local fbq queue */")
 page.route("https://connect.facebook.net/**",mock_pixel)
 page.route("https://www.facebook.com/**",lambda r:r.fulfill(status=204,body=""))
 page.route("https://nrwbnjjaqilgreqhpcov.supabase.co/functions/v1/promoflash-events",lambda r:r.fulfill(status=200,content_type="application/json",headers={"Access-Control-Allow-Origin":"*"},body='{"accepted":true}'))
 response=page.goto(BASE+"/",wait_until="domcontentloaded",timeout=30000)
 assert response and response.status==200, f"Landing response: {response.status if response else None}"
 expect(page.locator("h1")).to_be_visible()
 page.wait_for_function("typeof window.fbq==='function' && Array.isArray(window.fbq.queue) && window.fbq.queue.length>=2",timeout=20000)
 assert any("connect.facebook.net/en_US/fbevents.js" in u for u in requested),requested
 result=page.evaluate("""() => ({id:window.PROMOFLASH_CONFIG?.metaPixelId,queue:window.fbq.queue.map(v=>Array.from(v))})""")
 assert result["id"]==PIXEL,result
 assert ["init",PIXEL] in result["queue"],result
 assert ["track","PageView"] in result["queue"],result
 print("PASS production HTTPS landing, Meta Pixel ID and PageView queued; no real tracking sent")
 account=page.goto(BASE+"/cuenta.html",wait_until="domcontentloaded",timeout=30000)
 assert account and account.status==200
 expect(page.locator("#signedOut")).to_be_visible(timeout=20000)
 expect(page.locator("#signIn")).to_be_visible()
 expect(page.locator("#signUp")).to_be_visible()
 assert page.url.startswith(BASE+"/cuenta.html")
 print("PASS account login/signup entry, correct app, no credentials submitted")
 editor=page.goto(BASE+"/editor.html",wait_until="domcontentloaded",timeout=30000)
 assert editor and editor.status==200
 expect(page.locator("#resultGallery canvas").first).to_be_visible(timeout=20000)
 assert page.url.startswith(BASE+"/editor.html")
 print("PASS free editor on same domain")
 assert not errors,errors
 ctx.close()
 browser.close()
