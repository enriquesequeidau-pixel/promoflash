# PromoFlash — contrato inicial de campañas (borrador, NO desplegar)

Este PR agrega v2/campaign-core.mjs, un normalizador puro para planificar
campañas de productos existentes. No se conecta a la interfaz, no escribe en
Supabase, no agenda publicaciones, no activa Pro/Business ni pagos.

## Contrato del borrador

- **title**: texto de 1 a 80 caracteres, sin controles ni marcas de dirección.
- **channel**: instagram, facebook o whatsapp; solo un canal por borrador.
- **productIds**: de 1 a 50 UUID distintos de productos del catálogo privado.
- **startsAt** y **endsAt**: ambos nulos o UTC ISO 8601 con inicio anterior al fin.
- **status**: exclusivamente draft. Las fechas son metadatos, **no** programan
  publicaciones ni implican autorización de acceso a los productos.
- Se rechazan propiedades adicionales (fotos, tokens, URLs de cobro, etc.).

## Esquema de staging propuesto (NO aplicado)

migrations/20261027_pf_campaign_drafts_stage_only.sql contiene una propuesta
transaccional para dos tablas: pf_campaign_drafts y pf_campaign_products.
Depende de que exista public.pf_catalog_items del PR #26; si falta, falla
antes de crear tablas. Crea un índice único compuesto (user_id, id) en el
catálogo y claves foráneas compuestas que impiden asociar un producto ajeno
a una campaña. La posición única entre 1 y 50 limita el número de referencias
y la restricción de estado impide publicar o programar desde la base.

**Cerrado por defecto:** ambas tablas usan RLS forzado, no tienen políticas
de acceso y revocan permisos a PUBLIC, anon y authenticated. Por tanto,
la migración por sí sola **no habilita lectura ni escritura del navegador**,
aunque el usuario esté autenticado o tenga un plan. Solo un backend revisado
podría incorporar la autorización de suscripción y operaciones atómicas;
no se debe usar service_role en el cliente.

Las referencias se eliminan en cascada al borrar un producto, pero esto puede
dejar un borrador sin productos: el backend deberá validar nuevamente el
mínimo de un producto antes de guardar, mostrar o publicar. Las restricciones
SQL no reemplazan validación de entrada, permisos de suscripción, cuotas ni
pruebas de concurrencia.

**No ejecutar esta migración en producción.** Ensayarla primero en PostgreSQL
aislado con el catálogo del PR #26, dos usuarios ficticios, revocación de
permisos y verificación de todas las FK/RLS. La prueba local
node --test tests/campaign-schema.test.mjs revisa invariantes **estáticos**
del archivo SQL, no ejecuta PostgreSQL ni demuestra aislamiento efectivo.
No se ha aplicado ninguna migración. No eliminar tablas con datos en un
rollback sin plan de retención aprobado.

## Verificaciones obligatorias antes de persistir o habilitar planes

1. Probar la migración del catálogo pf_catalog_items en staging y RLS real
   con dos cuentas ficticias. No aplicar migraciones productivas sin aprobación.
2. Ejecutar la propuesta de campañas en PostgreSQL aislado y comprobar FKs
   compuestas, RLS, denegación de acceso anónimo/autenticado y eliminación de
   referencias sin afectar a otros propietarios.
3. Establecer límites de campañas y funciones Pro/Business a partir de reglas
   comerciales aprobadas; no inventar precios ni cuotas. La comprobación de
   suscripción y límites debe hacerse en el servidor, no solo en JavaScript.
4. Crear pruebas de concurrencia, revocación de sesión, acceso cruzado y
   eliminación de productos, además de una política de retención y reversión.
5. Antes de habilitar automatización, definir consentimientos, límites por
   canal, integraciones oficiales, colas, reintentos y mecanismo de cancelación.

**Estado:** contrato, esquema propuesto y pruebas estáticas únicamente; no
existe persistencia activa de campañas, checkout, publicación automática ni
lanzamiento de Pro/Business.

Ejecutar localmente:
node --test tests/campaign-core.test.mjs tests/campaign-schema.test.mjs.
