# PromoFlash v1.2 — controles implantados y pendientes reales

## Implantado
- Registro de interesados a través de `promoflash-lead` (control de origen, validación, limitación 15 peticiones/día/IP aprox.). HTTPS y acceso Supabase.
- `promoflash-events`: eventos anonimizados de descargas/carga/generación, únicamente si se acepta la medición; límite 100 por día/IP aprox.
- Editor: fotografía procesada en dispositivo, ZIP de 3 PNG, sin pagos.
- Cobros públicos Pro siguen desactivados. No compartir el enlace genérico de Mercado Pago.
- Campaña Meta: solo promocionar editor gratis; presupuesto total 7.500 CLP, finaliza 20 oct 2026, sujeto a revisión de Meta.

## Pendiente para publicar la campaña
1. Agregar identidad legal real y datos de contacto válidos en privacidad. Si el público está en México, revisar normativa de datos aplicable; pedir asesoría local cuando corresponda.
2. Comprobar el formulario en el sitio publicado con un correo de prueba propio y consentimiento. No significa enviar correo: es registrarse en la lista desde la landing.
3. Probar subir una fotografía, crear tres promos, descargar ZIP y abrir cada PNG en un móvil.
4. Confirmar la campaña Meta en borrador, URL/UTM y presupuesto total antes de publicar. Activar la publicidad solo con aprobación del titular.
5. Verificar cada endpoint con pruebas de red; este contenedor tiene DNS externo restringido.
6. Pagos Pro: checkout bloqueado; falta conciliación integral, cancelaciones, reintentos y venta real de prueba.

## Medición
`public.pf_analytics_events` guarda SOLO nombre de evento, campaña/fuente/medio/categoría y fecha, sin cookies de rastreo ni correos. El registro consentido almacena email y rubro por separado. Los datos de terceros (Meta Ads) son independientes de esto.

## Protección de abusos
Los límites actuales no son totalmente atómicos ante solicitudes concurrentes. Para escalar o aceptar mucho tráfico, implementar función SQL atómica/Turnstile. Antes de campaña, RLS y permisos deben bloquear inserción anónima directa por REST para que no evada el control. 
