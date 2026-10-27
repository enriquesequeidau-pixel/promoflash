# PromoFlash — estado verificado de lanzamiento

**Actualizado:** 27 de octubre de 2026.

## Inicio de actividades — domicilio comercial ya contratado

El titular confirmó el 27-10-2026 la **compra de una oficina virtual** para
Sequeidau Labs SpA. Los documentos del inmueble y el certificado de inicio
de actividades del SII **aún no han llegado/obtenido**. No pedir otra compra.

El negocio comercial objetivo de PromoFlash sigue siendo **México**.
Los precios acordados son **Pro $99 MXN/mes** y
**Business $199 MXN/mes**, pero el producto de pago aún no cumple todas
las funciones comprometidas. No habilitar un checkout directo solo por
tener una pasarela disponible.

Paddle publica que puede vender a compradores en México y utilizar MXN,
incluso como merchant of record. Eso **NO verifica que haya aprobado como
comerciante a Sequeidau Labs SpA** ni que el contrato, métodos de pago o
precio concreto estén activos. Fuente:
https://developer.paddle.com/concepts/sell/supported-countries-locales/

Condiciones mínimas para Pro/Business: merchant aprobado, catálogo
y precio real en MXN, firma de eventos y conciliación, entrega de acceso
por pago confirmado, cancelación/reembolso y expiración, pruebas de
plan Pro y Business, T&C y privacidad correctos para consumidores de
México. Hasta completar: `proPaymentsEnabled=false`.

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
