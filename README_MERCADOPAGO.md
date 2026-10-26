# PromoFlash Pro — estado de cobros

**Mercado aprobado:** México. **Planes propuestos:** Pro $99 MXN/mes y Business $199 MXN/mes.

**Estado actual (26 de octubre de 2026):** los cobros siguen deshabilitados. La interfaz tiene `proPaymentsEnabled: false` y la función desplegada `promoflash-checkout` responde `503 mx_checkout_provider_pending`. El checkout mexicano todavía no está implementado.

El enlace y plan heredados de **$4.990 CLP** corresponden a una configuración anterior de Chile. No representan los planes mexicanos y no deben compartirse ni usarse para activar Pro.

## Qué falta antes de vender Pro

1. Confirmar un proveedor aprobado para cobrar suscripciones en MXN a clientes de México.
2. Implementar el checkout mexicano y el acceso vinculado a una cuenta verificada.
3. Verificar pagos aprobados desde el servidor, firma e idempotencia de webhooks, cancelaciones, vencimientos, reembolsos y fallas.
4. Completar y probar los seis módulos Pro del alcance comercial aprobado: campañas completas, catálogo, kits de temporada, calendario, identidad de marca y promociones para WhatsApp.
5. Actualizar términos y privacidad para describir los planes y la retención de datos.

El editor gratuito sigue disponible. Las claves privadas deben guardarse solo como secretos del servidor; nunca en los archivos web. Un enlace de pago externo por sí solo no debe conceder acceso Pro.
