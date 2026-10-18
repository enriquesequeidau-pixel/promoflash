# PromoFlash — Landing v0.7 y checklist para publicidad

## Qué está operativo en código
- `index.html`: landing comercial renovada, **autocontenida**: incluye CSS, JS y 3 imágenes reales integradas. No depende de carpeta `assets`.
- `editor.html`, `editor.css`, `editor.js`: editor existente v0.6 con tres promociones y ZIP.
- `analytics-editor.js`: registro condicional de eventos en GA4, Meta Pixel y Plausible (opcional), sin carga previa al consentimiento.
- `privacidad.html` y `terminos.html`: avisos de DEMO; **antes de captar datos o cobrar necesitan completar identidad/contacto reales del responsable**.
- `config.js`: configuración pública: URL y publishable key de Supabase, GA4 ID, Meta Pixel ID y contacto. Nunca colocar claves secretas.
- `supabase_setup.sql`: migración para base de interesados con INSERT anónimo y RLS; NO suficiente para campañas masivas sin antispam server-side.
- `ADS_PLAN_10_USD.md`: anuncios y criterios de activación.

## Publicar ahora (sin esperar a un dominio nuevo)
1. Abrir https://github.com/enriquesequeidau-pixel/promoflash
2. Descomprimir `PromoFlash_Launch_v07.zip` y subir al directorio raíz de `main` los siguientes archivos: `index.html`, `editor.html`, `editor.css`, `editor.js`, `analytics-editor.js`, `config.js`, `privacidad.html`, `terminos.html`.
3. Si GitHub pregunta, reemplazar archivos existentes; hacer `Commit changes`.
4. Verificar tras publicación: https://enriquesequeidau-pixel.github.io/promoflash/?v=7 y /editor.html.
5. Importante: `index.html` incluye sus imágenes reales; no es necesario subir `assets/` para mostrar la landing.

## Captar correos REALES — requiere elección de proyecto y completar responsable
1. Crear un proyecto Supabase nuevo dedicado a PromoFlash en la organización que el propietario autorice. No tocar proyectos existentes de otros productos.
2. Revisar docs y ejecutar `supabase_setup.sql` en proyecto NUEVO.
3. Configurar `config.js` usando SOLAMENTE project URL y key publicable; nunca `service_role`/secret.
4. Configurar `contactEmail` con correo propio válido. Completar la política de privacidad con entidad responsable, canal de contacto, propósito, retención y derechos.
5. Probar un registro con consentimiento, verificar fila desde Supabase dashboard; comprobar que cliente anónimo no puede leer filas.
6. Antes de campañas amplias, proteger el endpoint con Turnstile verificado del lado servidor + límites por IP y deduplicación para evitar spam. El honeypot del formulario no es protección completa.

## Medición de anuncios
1. Crear o conectar GA4 o Meta Pixel en cuentas del negocio.
2. Colocar IDs públicos en `config.js` (`ga4MeasurementId`, `metaPixelId`). En la landing se pide consentimiento y no se cargan etiquetas si se rechaza.
3. Probar eventos: clic a editor `hero_demo`, descarga desde editor `promo_download_all`, formulario `lead_submitted`.
4. Solo entonces activar el primer anuncio con `?utm_source=meta&utm_medium=paid_social&utm_campaign=mx_beauty_test_01`.

## Cobros — NO ACTIVOS
- Pro todavía no está implementado, por eso no se cobra ni se promete acceso inmediato.
- Para vender una suscripción real se necesita Merchant account aprobada (verificar disponibilidad local), precio/producto, checkout, webhooks verificados, control de acceso al plan Pro del lado servidor, cancelación y términos legales.
- Nunca activar un enlace de pago directo por sí solo sin verificar la autorización del usuario al plan en el backend.

## Estado de permisos externos
- Conexión GitHub de ChatGPT pudo LEER `promoflash`, pero al intentar publicar dio 403 (integración sin escritura). Hasta cambiar permisos, actualización es subida manual.
- Supabase conectado ofrece dos proyectos **INACTIVE**, sin uno específico de PromoFlash. No reutilizarlos sin confirmación.
- Meta Ads, Stripe/Paddle/Mercado Pago no están configurados para PromoFlash.

## Condición para invertir los US$10
Landing y editor públicos (sí, al subir), eventos probados y captura real de interesados + privacidad identificada (pendiente hasta conectar servicios). No destinar US$30–50 a anuncios sin lo anterior.
