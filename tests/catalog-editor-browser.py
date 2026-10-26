"""PromoFlash v2: Chromium QA against the REAL Free editor and opt-in catalog modules.
Local HTTP only. Catalog responses and account tokens are synthetic; no live services.
"""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
import json
import struct
import tempfile
import zipfile

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
BRAND_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
BRAND_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
PRODUCT_A = dict(id="product-a", brandId=BRAND_A, name="Café mexicano",
                 description="Grano", category="food", priceCentavos=19900,
                 currency="MXN", photoAssetId=None)
PRODUCT_B = dict(PRODUCT_A, id="product-b", brandId=BRAND_B, name="Otro producto")


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


def attach_opt_in(page):
    # Not wired into Free: opt-in is injected only in this isolated QA browser.
    page.evaluate("""async () => {
      const {createCatalogEditorHttpClient} =
        await import('./v2/catalog-editor-http-client.mjs');
      const {attachCatalogEditorButton} =
        await import('./v2/catalog-editor-bridge.mjs');
      const select = document.createElement('select');
      select.id = 'catalogSelect';
      select.innerHTML = '<option value="product-a">Producto de prueba</option>';
      const button = document.createElement('button');
      button.id = 'catalogPick'; button.type = 'button';
      button.textContent = 'Importar producto de prueba';
      document.querySelector('.setup-card').append(select, button);
      window.__catalogErrors = [];
      window.__catalogAction = attachCatalogEditorButton({
        button, select, doc:document, request:'owner-one-token',
        ...createCatalogEditorHttpClient(),
        onError:e=>window.__catalogErrors.push(e.code || e.message)
      });
    }""")


def fields(page):
    return page.evaluate("""() => ['productName','price','brand'].map(
      id=>document.getElementById(id).value)""")


def run():
    handler = partial(QuietHandler, directory=str(ROOT))
    server = ThreadingHTTPServer(('127.0.0.1', 0), handler)
    thread = Thread(target=server.serve_forever, daemon=True)
    thread.start()
    base = 'http://127.0.0.1:' + str(server.server_port)
    calls, external = [], []
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(headless=True)
            context = browser.new_context(accept_downloads=True)

            def route_request(route):
                request = route.request
                url = request.url
                if not url.startswith(base + '/'):
                    external.append(url)
                    route.abort('blockedbyclient')
                    return
                if '/v2/catalog/' not in url:
                    route.continue_()
                    return
                path = url.split('/v2/catalog/', 1)[1]
                token = request.headers.get('authorization', '')
                calls.append((path, token))
                if token not in ('Bearer owner-one-token', 'Bearer owner-two-token'):
                    route.fulfill(status=401, body='{}', content_type='application/json')
                    return
                owner_a = token == 'Bearer owner-one-token'
                if path == 'products':
                    data = {'products': [PRODUCT_A if owner_a else PRODUCT_B]}
                elif path == 'brands':
                    data = {'brands': [{'id': BRAND_A if owner_a else BRAND_B,
                                       'name': 'CAFÉ DE CASA' if owner_a else 'OTRA TIENDA'}]}
                else:
                    route.fulfill(status=404, body='{}')
                    return
                route.fulfill(status=200, body=json.dumps(data),
                              content_type='application/json',
                              headers={'Cache-Control': 'no-store'})

            context.route('**/*', route_request)
            page = context.new_page()
            errors = []
            page.on('pageerror', lambda error: errors.append(str(error)))
            response = page.goto(base + '/editor.html', wait_until='load')
            assert response and response.status == 200
            page.locator('#resultGallery canvas').first.wait_for()
            assert page.locator('#resultGallery canvas').count() == 3
            assert page.locator('#catalogPick').count() == 0
            assert calls == []
            page.locator('#productName').fill('PRUEBA FREE')
            page.locator('.format[data-format="post"]').click()
            assert page.locator('#resultGallery canvas').first.evaluate(
                '(el) => [el.width,el.height]') == [360, 450]
            with page.expect_download(timeout=30000) as download_info:
                page.locator('#downloadAll').click()
            with tempfile.TemporaryDirectory() as tmp:
                path = Path(tmp) / 'promos.zip'
                download_info.value.save_as(str(path))
                with zipfile.ZipFile(path) as archive:
                    names = archive.namelist()
                    assert len(names) == 3 and len(set(names)) == 3, names
                    for name in names:
                        assert name.endswith('-post.png'), name
                        png = archive.read(name)
                        assert png[:8] == b'\x89PNG\r\n\x1a\n'
                        assert struct.unpack('>II', png[16:24]) == (1080, 1350)
            assert calls == [], calls
            print('PASS Free real editor: three canvases, post dimensions, ZIP/PNG; no catalog requests')

            before = fields(page)
            attach_opt_in(page)
            assert fields(page) == before, 'Opt-in attachment mutated Free'
            page.locator('#catalogPick').click()
            page.wait_for_function("""() => document.getElementById('productName').value
                === 'Café mexicano'""")
            assert fields(page) == ['Café mexicano', '$199.00 MXN', 'CAFÉ DE CASA']
            assert page.locator('.category[data-category="food"]').get_attribute('aria-pressed') == 'true'
            assert calls[-2:] == [('products', 'Bearer owner-one-token'),
                                  ('brands', 'Bearer owner-one-token')]
            assert page.evaluate('window.__catalogErrors') == []
            print('PASS opt-in: actual browser fetch + catalog bridge update the real editor')

            before = fields(page)
            page.evaluate("window.__catalogAction.setRequest('owner-two-token')")
            page.locator('#catalogPick').click()
            page.wait_for_function('window.__catalogErrors.length === 1')
            assert 'SELECTION' in page.evaluate('window.__catalogErrors[0]')
            assert fields(page) == before
            assert calls[-1] == ('products', 'Bearer owner-two-token')
            count = len(calls)
            page.evaluate('window.__catalogAction.setRequest(null)')
            page.locator('#catalogPick').click()
            page.wait_for_function('window.__catalogErrors.length === 2')
            assert page.evaluate('window.__catalogErrors[1]') == 'UNAUTHENTICATED'
            assert fields(page) == before and len(calls) == count
            print('PASS cross-account selection and anonymous Free deny private reads')

            # A second real editor page checks the in-flight account-switch race.
            stale = context.new_page()
            stale_errors = []
            stale.on('pageerror', lambda error: stale_errors.append(str(error)))
            stale.goto(base + '/editor.html', wait_until='load')
            stale.locator('#resultGallery canvas').first.wait_for()
            untouched = fields(stale)
            stale.evaluate("""() => {
              const realFetch = window.fetch.bind(window);
              window.fetch = (url,opts) => {
                if(url === '/v2/catalog/brands') return new Promise(resolve => {
                  window.__releaseBrand = () => realFetch(url,opts).then(response => {
                    window.__brandCompleted = true; resolve(response);
                  });
                });
                return realFetch(url,opts);
              };
            }""")
            attach_opt_in(stale)
            stale.locator('#catalogPick').click()
            stale.wait_for_function("typeof window.__releaseBrand === 'function'")
            stale.evaluate("""() => {
              window.__catalogAction.setRequest('owner-two-token');
              window.__releaseBrand();
            }""")
            stale.wait_for_function('window.__brandCompleted === true')
            stale.evaluate('() => new Promise(resolve => setTimeout(resolve, 0))')
            assert fields(stale) == untouched, 'Stale account response mutated Free'
            assert stale.evaluate('window.__catalogErrors') == []
            assert stale.locator('#catalogPick').is_enabled()
            assert not errors and not stale_errors, (errors, stale_errors)
            assert not external, 'Unexpected external network requests: ' + str(external)
            print('PASS session switch during pending brand fetch; no external requests or page errors')
            context.close()
            browser.close()
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)


if __name__ == '__main__':
    run()
