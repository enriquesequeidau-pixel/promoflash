"""Static authentication regression guards. No accounts or emails are created."""
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

class AuthPolicy(unittest.TestCase):
    def test_signup_and_recovery_min_ten_preserve_existing_login(self):
        src = (ROOT / 'cuenta.js').read_text('utf-8')
        html = (ROOT / 'cuenta.html').read_text('utf-8')
        self.assertIn("password.length<(action==='signup'?10:8)",src)
        self.assertIn("if(password.length<10){message('recoveryNotice'",src)
        self.assertIn('id="newPassword" type="password" minlength="10"',html)
        self.assertIn('Para crear una cuenta nueva, usa una contraseña de al menos 10 caracteres.',html)
    def test_app_owned_auth_redirect_and_scoped_session(self):
        src = (ROOT / 'cuenta.js').read_text('utf-8')
        self.assertIn("storageKey:'sequeidaulabs-promoflash-auth-v1'",src)
        self.assertIn("client.auth.signOut({scope:'local'})",src)
        self.assertIn("emailRedirectTo:new URL('cuenta.html',location.href).href",src)
        self.assertIn("resetPasswordForEmail(email,{redirectTo})",src)
        self.assertNotIn('misterioya.sequeidaulabs.com',src)
    def test_account_document_csp(self):
        html=(ROOT / 'cuenta.html').read_text('utf-8')
        self.assertIn('http-equiv="Content-Security-Policy"',html)
        self.assertIn("script-src 'self' https://cdn.jsdelivr.net",html)
        self.assertIn("object-src 'none'",html)
        self.assertNotIn("script-src 'unsafe-inline'",html)

    def test_expired_session_prevents_pro_refresh(self):
        src=(ROOT/'cuenta.js').read_text('utf-8')
        self.assertIn("if(!user){message('accountNotice','Tu sesión venció. Inicia sesión nuevamente.');await render();return;}",src)
        self.assertIn("client.auth.signOut({scope:'local'})",src)

    def test_pro_money_switch_remains_off(self):
        cfg = (ROOT / 'config.js').read_text('utf-8')
        self.assertIn('proPaymentsEnabled: false',cfg)
        self.assertIn("proTargetCountry: 'MX'",cfg)
        self.assertIn("proTargetCurrency: 'MXN'",cfg)
        self.assertIn("proCheckoutUrl: ''",cfg)
        self.assertNotIn('mpago.la/',cfg)

if __name__=='__main__':
    unittest.main()
