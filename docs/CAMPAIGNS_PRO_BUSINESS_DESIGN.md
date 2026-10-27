# PromoFlash — contrato inicial de campañas (borrador, NO desplegar)

Este cambio agrega únicamente `v2/campaign-core.mjs`, un normalizador puro para
planificar campañas de productos existentes. No se conecta a la interfaz, no
escribe en Supabase, no agenda publicaciones, no activa Pro/Business ni pagos.

## Contrato del borrador

- `title`: texto de 1 a 80 caracteres, sin controles ni marcas de dirección.
- `channel`: `instagram`, `facebook` o `whatsapp`; solo un canal por borrador.
- `productIds`: de 1 a 50 UUID distintos de productos del catálogo privado.
- `startsAt` y `endsAt`: ambos nulos o UTC ISO 8601 con inicio anterior al fin.
- `status`: exclusivamente `draft`. Las fechas son metadatos, **no** programan
  publicaciones ni implican autorización de acceso a los productos.
- Se rechazan propiedades adicionales (fotos, tokens, URLs de cobro, etc.).

## Verificaciones obligatorias antes de persistir o habilitar planes

1. Probar la migración del catálogo `pf_catalog_items` en staging y RLS real
   con dos cuentas ficticias. No aplicar migraciones productivas sin aprobación.
2. Diseñar las tablas de campañas con `user_id`, RLS y claves compuestas que
   garanticen que cada producto asociado pertenece al mismo usuario. El UUID
   validado en el navegador **no demuestra propiedad**.
3. Establecer límites de campañas y funciones Pro/Business a partir de reglas
   comerciales aprobadas; no inventar precios ni cuotas. La comprobación de
   suscripción y límites debe hacerse en el servidor, no solo en JavaScript.
4. Crear pruebas de concurrencia, revocación de sesión, acceso cruzado y
   eliminación de productos, además de una política de retención y reversión.
5. Antes de habilitar automatización, definir consentimientos, límites por
   canal, integraciones oficiales, colas, reintentos y mecanismo de cancelación.

**Estado:** contrato y pruebas locales únicamente; no existe persistencia de
campañas, checkout, publicación automática ni lanzamiento de Pro/Business.

Ejecutar localmente: `node --test tests/campaign-core.test.mjs`.
