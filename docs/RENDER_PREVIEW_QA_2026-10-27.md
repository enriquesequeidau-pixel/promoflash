# PromoFlash México — bloqueo del preview y paso de lanzamiento (27-10-2026)

## Hallazgo comprobado

Sitio estático existente: Render `promoflash-comercial-preview`,
servicio `srv-dbbtvnei0phs73e7lpn0`, `autoDeploy=no`.
Su **Build Command actual** solo copiaba documentos, editor y `cuenta.js`, pero
**omitía módulos importados por la página de cuenta y marca**.

Se verificó directamente el 27-10-2026:
- `https://promoflash-comercial-preview.onrender.com/cuenta.html`: página accesible.
- `/auth-captcha.mjs`: **HTTP 404**.
- `/auth-storage.mjs`: **HTTP 404**.
- `/brand.css`: **HTTP 404**.
- Además, `cuenta.html` hace referencia a `brand-mark.png` y
  `brand-symbol.svg`, ambos ausentes del Build Command anterior.
  Este hecho deriva del comando configurado, no equivale a una comprobación
  HTTP adicional para esas dos imágenes.

La UI de cuenta no puede considerarse QA aprobadа mientras falten imports.
No efectuar más pruebas de recuperación/login en esa preview hasta publicar
los recursos necesarios. El checkout Pro permanece desactivado.

## Cambio preparado en código — **NO aplicado al servicio Render actual**

`render.yaml` tiene ahora la lista completa de activos públicos e incluye
orígenes de Cloudflare Turnstile para cargar su widget con las protecciones
CSP correspondientes. Test automático
`tests/render-preview-assets.test.mjs` verifica archivos y lista de copia.
No se incorporaron claves privadas ni se activaron pagos.

**Render NO sincroniza el Build Command de un servicio existente solo porque
se edite `render.yaml`:** el Blueprint es únicamente referencia salvo que
el servicio esté gestionado por Blueprint y sincronizado. No crear servicios
duplicados. Se debe actualizar **el Build Command del servicio existente**
desde Render y activar un despliegue manual con el mismo comando validado.

Comando exacto esperado en Render:
```sh
mkdir -p dist && cp index.html landing.css landing.js editor.html editor.css editor.js analytics-editor.js cuenta.html cuenta.js config.js privacidad.html terminos.html auth-captcha.mjs auth-storage.mjs brand.css brand-mark.png brand-symbol.svg dist/
```

Después verificar HTTP 200 para los tres recursos originalmente faltantes,
que el cliente carga con CSP y que puede iniciar sesión y recuperar contraseña.
Evitar datos reales en QA; solo cuentas ficticias si hay CAPTCHA/Auth habilitados.

## Prioridad comercial

- Mercado objetivo: **México**. `proTargetCountry=MX`,
  `proTargetCurrency=MXN`.
- `proPaymentsEnabled=false`, sin checkout activo. **NO activar Live**.
- Falta elegir y aprobar pasarela mexicana y QA end-to-end del plan Pro,
  privacidad/contratos y habilitación tributaria que corresponda.
- Sequeidau Labs SpA **aún no inició actividades**: el titular comprará
  domicilio virtual compatible y después realizará la gestión ante SII.
- No vender suscripciones ni anunciar checkout habilitado por el momento.
  El editor gratuito puede usarse para validar interés y leads con
  consentimiento y antiabuso; no afirma un servicio Pro comercial.
