"""Non-payment OPTIONS-only CORS smoke checks for this app's isolated Edge Functions."""
import unittest,urllib.request,urllib.error
BASE="https://nrwbnjjaqilgreqhpcov.supabase.co/functions/v1/"
ORIGIN="https://promoflash.sequeidaulabs.com"
FOREIGN="https://cotizaflow.sequeidaulabs.com"
FUNCTIONS=["promoflash-lead","promoflash-events","promoflash-pro-studio","promoflash-checkout"]
def preflight(slug):
 req=urllib.request.Request(BASE+slug,method='OPTIONS',headers={
  "Origin":ORIGIN,
  "Access-Control-Request-Method":"POST",
  "Access-Control-Request-Headers":"apikey,authorization,content-type"
 })
 with urllib.request.urlopen(req,timeout=25) as response:
  return response.status,response.headers.get('Access-Control-Allow-Origin')
class EdgeOrigins(unittest.TestCase):
 def test_each_function_allows_own_domain_only(self):
  for slug in FUNCTIONS:
   with self.subTest(slug=slug):
    code,allow=preflight(slug)
    self.assertIn(code,(200,204),slug)
    self.assertEqual(allow,ORIGIN,slug)
    self.assertNotEqual(allow,FOREIGN,slug)

class ProAccessBoundary(unittest.TestCase):
 def test_missing_session_is_denied_without_touching_payments(self):
  req=urllib.request.Request(BASE+"promoflash-pro-studio",method="POST",
   headers={"Origin":ORIGIN,"Content-Type":"application/json"},data=b'{}')
  with self.assertRaises(urllib.error.HTTPError) as fail:
   urllib.request.urlopen(req,timeout=25)
  self.assertEqual(fail.exception.code,401)

class MexicoCheckoutFailsClosed(unittest.TestCase):
 def test_legacy_chile_checkout_is_unavailable_even_if_called_directly(self):
  request=urllib.request.Request(BASE+"promoflash-checkout",method="POST",
   headers={"Origin":ORIGIN,"Content-Type":"application/json"},data=b'{}')
  with self.assertRaises(urllib.error.HTTPError) as fail:
   urllib.request.urlopen(request,timeout=25)
  self.assertEqual(fail.exception.code,503)
  import json
  response=json.loads(fail.exception.read().decode("utf-8"))
  self.assertEqual(response["error"],"mx_checkout_provider_pending")
  self.assertEqual(response["market"],"MX")
  self.assertEqual(response["currency"],"MXN")

if __name__=="__main__":
 unittest.main()
