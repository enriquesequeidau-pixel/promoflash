# PromoFlash — landing + demo (validación)

## Qué funciona
- `index.html`: landing responsive en español, pricing honesto y formulario de acceso anticipado.
- `editor.html`: editor de promociones con 3 plantillas y descarga PNG 1080×1920, procesada en el navegador.
- Eventos opcionales de Plausible: `demo_click`, `waitlist_click`, `waitlist_submitted` (desde la landing).
- `schema.sql`: tabla de correos con política de acceso anónimo de solo inserción.

## Cómo probar
Abre `index.html`. La demo funciona sin servicios externos. El formulario mostrará que requiere configuración hasta que conectes Supabase.

## Cómo publicar (por tu cuenta)
1. Crea un sitio estático en Cloudflare Pages, Netlify o Vercel y sube estos archivos manteniendo su estructura.
2. Si quieres registrar interesados: crea un proyecto Supabase, ejecuta `schema.sql` en el SQL Editor y copia en `config.js` la URL del proyecto y la clave pública (anon/publishable). **No pegues jamás la service_role key**.
3. Prueba el formulario con un correo nuevo desde el sitio publicado. Los correos quedarán en `public.waitlist` (visibles al propietario en Supabase).
4. Opcional: configura tu dominio en Plausible y añade el dominio en `config.js` para medir los 3 eventos de la landing.
5. Para anuncios: instala Meta Pixel **solo después** de definir el aviso y la gestión de consentimiento adecuados a los países objetivo. Usa `demo_click`, `waitlist_submitted` y `download_png` como eventos clave (este último requiere conectar medición en el editor).

## Antes de campañas públicas
- Añade aviso de privacidad real con responsable, finalidad, conservación y derechos, más contacto.
- Añade antispam/rate limiting y validación del lado servidor para la lista; la inserción directa desde navegador no es suficiente para escalar.
- Verifica cómo obtendrás consentimiento y configurarás analítica publicitaria donde corresponda.
- El plan Pro a US$4,99 está **propuesto**: NO hay cobros ni login, no anunciar como disponible.
- La landing no está desplegada automáticamente. Conecta una cuenta de hosting para publicar.

## Mejoras v0.3
- Editor muestra un CTA hacia acceso Pro después de descargar la imagen (sin bloquear la descarga gratuita).
- Pasan parámetros UTM entre landing y editor; se guardan `utm_campaign` y `utm_medium` junto con el registro.
- Consentimiento explícito para uso del correo en el formulario.
- Eventos adicionales `photo_selected` y `pro_interest_editor` cuando se configura Plausible.
- `ADS_30_50_USD.md`: plan de anuncios con tope de US$50.
- Si ejecutaste una versión previa de `schema.sql`, agrega las columnas de UTM manualmente o usa la migración.
- **No está listo para publicidad aún:** sin URL pública ni proyecto Supabase configurado; añade contacto e identidad de responsable de datos, aviso de privacidad y antispam antes de campañas.
