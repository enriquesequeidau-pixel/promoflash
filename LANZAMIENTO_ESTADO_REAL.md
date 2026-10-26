# PromoFlash — estado verificado de lanzamiento

**Actualizado:** 26 de octubre de 2026.

## Disponible

- El sitio y el editor gratuito están publicados.
- Registro y acceso usan la identidad central de Supabase; la cuenta redirige a PromoFlash.
- Hay tablas y funciones protegidas para cuenta, entitlements y herramientas Pro parciales.
- El alcance comercial aprobado apunta a México: Pro $99 MXN/mes y Business $199 MXN/mes.

## Aún no disponible para venta pagada

- `proPaymentsEnabled=false`; la función `promoflash-checkout` devuelve `503 mx_checkout_provider_pending`.
- No hay checkout mexicano operativo ni una transacción de suscripción verificada.
- La función Pro existente solo genera titulares y guarda una marca; no implementa el alcance Pro completo.
- Faltan catálogo, campañas completas, kits, calendario, separación de varias marcas, promociones para WhatsApp y límites de plan.
- El plan y enlace heredados de $4.990 CLP son de una configuración anterior para Chile; no corresponden al producto aprobado para México.

## Para cerrar el lanzamiento Pro

- Elegir y aprobar el proveedor que cobrará suscripciones en MXN.
- Implementar y verificar checkout, webhooks, cancelación, reembolso, expiración y entrega/revocación de acceso.
- Completar y probar las funciones Pro aprobadas y actualizar términos y privacidad.
- Mantener los cobros y la publicidad pagada apagados hasta completar esas validaciones.

El editor gratuito puede seguir captando usuarios mientras se completa el producto de pago.
