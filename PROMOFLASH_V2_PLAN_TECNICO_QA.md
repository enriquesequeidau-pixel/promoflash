# PromoFlash v2 — implementación técnica y plan de validación

**Estado:** plan técnico creado el 24-10-2026. Ningún cambio de esquema, Edge Function, checkout, hosting ni campañas se ejecuta por este documento.
**Referencia comercial:** `PROMOFLASH_V2_COMERCIAL_APROBADO.md`.
**Código base:** `index.html`, `editor.html`, `editor.js`, `cuenta.html`, `cuenta.js`, `config.js` y funciones Supabase existentes.

## A. Inventario técnico y garantías previas (fase 0)

1. Obtener versión exacta de GitHub Pages/dominio real, HEAD de `main`, Actions y artefactos de QA; usar rama de trabajo para implementación y revisión antes de merge/deploy.
2. Registrar base compartida actual de Supabase (PromoFlash/CotizaFlow/MisterioYa): `pro_entitlements`, `pro_brand_kits`, `mp_subscription_links`, funciones `promoflash-pro-studio`, `promoflash-plan-check`, `promoflash-checkout` y `mercadopago-webhook`. Confirmar contratos y esquema con lecturas de solo metadatos y migraciones existentes. NO alterar otros namespaces.
3. Crear respaldo verificable de datos actuales y ensayo de restauración en entorno aislado, especialmente tablas compartidas. Anotar plan de rollback de app, funciones y esquema.
4. Comprobar que el plan Pro CLP 4.990 heredado NO se exponga como checkout MXN ni conceda Business. Verificar `proPaymentsEnabled=false` y `PF_CHECKOUT_ENABLED` apagado.
5. Identificar secretos e integraciones: publishable key pública, `service_role` solo en backend; autenticar JWT dentro de las funciones que usan `verify_jwt=false`. No usar campos editables por usuario como rol de pago.

**Salida:** inventario y estado base con evidencia, migraciones reversibles preparadas, entorno de pruebas separado.

## B. Arquitectura y permisos propuestos (fase 1)

Agregar recursos específicos de PromoFlash bajo prefijo `pf_v2_`, sin compartir tablas de negocio con otras apps:

- `pf_v2_brands`: id, owner_uid, nombre, paleta validada, contacto comercial opcional, referencia de logo, created_at.
- `pf_v2_products`: id, brand_id, owner_uid, nombre, descripción, categoría, precio numérico + moneda MXN, referencia de foto opcional, timestamps.
- `pf_v2_campaigns`: id, brand_id, owner_uid, product_id, intención/tipo, plantilla, configuración serializable validada, timestamps.
- `pf_v2_calendar_entries`: id, campaign_id, brand_id, owner_uid, scheduled_at + timezone, status, updated_at.
- Tabla/visión de permisos `pf_v2_plan_access` u otro mecanismo confiable ligado a la conciliación del proveedor, con `free`, `pro`, `business`, vencimiento efectivo y provenance. NUNCA permitir al usuario editar su plan.

Los nombres/columnas son **borradores**, no SQL aplicado. Definir relaciones ON DELETE y política de privacidad/retención después de inspeccionar el esquema vigente. Mantener IDs de propietario validables, unicidad adecuada y límites aplicados dentro de transacciones en servidor (evitar carreras por múltiples pestañas). Si se habilita foto/ logo en almacenamiento cloud, bucket PRIVADO con rutas por cuenta, cuotas, validación de contenido y políticas por dueño; no usar URLs públicas persistentes.

Para toda tabla expuesta, RLS activa con `auth.uid() = owner_uid` en SELECT/INSERT/UPDATE/DELETE y `WITH CHECK` para evitar reasignaciones. Proteger también relaciones padre-hijo (no bastan owner_uid y brand_id separados si no se comprueba que pertenecen al mismo usuario). Separación de permisos por aplicación. Consultar políticas y grants antes de exponer recursos por Data API.

**Control de planes:** Free no depende de cuenta; operaciones premium requieren login y función de servidor que valide derecho `pro` o `business` vigente. Business permite hasta 5 marcas/250 productos/100 campañas; Pro 1/50/20. La cuota cuenta registros simultáneos, no descargas o operaciones al mes. No confiar en `localStorage` o flags enviados por navegador.

## C. Orden de implementación

1. **Módulo común y contratos:** definir tipos de datos, endpoint de plan, errores (401 no autenticado, 403 sin derechos, 409 cuota, 422 validación), migraciones aisladas y suites de unidad.
2. **Identidad de marca:** CRUD seguro, 1/5 marcas, aplicar paletas y logos al editor; sin mutar las plantillas Free actuales.
3. **Catálogo:** CRUD 50/250, pertenencia a marca, reutilización en el editor, textos y precios MXN sanitizados, exportación y eliminación controlada.
4. **Campañas completas:** reutilizar motor Canvas del editor para 3 variantes x 3 formatos (9 PNG), ZIP con nombres seguros, encabezados y textos; exportación local por defecto, sin cargas obligatorias a backend.
5. **Kits temporada:** Buen Fin/Hot Sale/Día de las Madres/Navidad, textos de muestra editables, evitar ofertas engañosas y uso impropio de marcas registradas.
6. **Calendario:** semana/mes, fechas de zona México elegida por el usuario, reprogramación manual, estados y exportación. Sin cuentas OAuth de redes ni programación automática.
7. **WhatsApp:** texto precompuesto y botón compartir/copiar; el usuario inicia el envío, sin automatización ni blast.
8. **Business:** selección de marca, separación de catálogos/campañas/calendarios, validaciones de límites agregados, degradación sin pérdida silenciosa.
9. **Facturación México:** propuesta de checkout separada del CLP heredado, dos productos recurrentes verificados por servidor, webhooks firmados e idempotentes, validación de pagos efectivos, reversión tras vencimiento/reembolso, cancelación y no renovación. PROHIBIDO ejecutar cobros Live sin aprobación posterior.
10. **Landing y términos:** solo anunciar como activos los módulos probados, precio MXN y desglose fiscal adecuado; crear mensajes de indisponibilidad mientras estén en preparación.

## D. Matriz mínima de QA con evidencia

| Área | Caso esperado | Evidencia |
|---|---|---|
| Free | Editor mantiene 9 estilos, 5 rubros, 3 formatos, PNG + ZIP; sin sesión | E2E navegadores y ZIP verificado |
| Privilegios | Usuario Free intenta CRUD premium o exportación Business | HTTP 403 y sin filtración |
| Cuotas | Pro 1 marca, 50 productos, 20 campañas; uno adicional | Denegación 409 desde servidor |
| Cuotas Business | 5 marcas, 250 productos, 100 campañas | Denegación 409 en excedente |
| Cross-tenant | Usuario A lee/edita/elimina marca o campaña B, incluso con IDs conocidos | 403/404 y cero cambios |
| Parent-child | Intento de unir producto A con marca B | 422/403, integridad mantenida |
| Concurrencia | Dos solicitudes crean el registro 51 o campaña 21 simultáneamente | Solo una pasa, cuota no excedida |
| Marca | Guardar logo/colores/telefono, recargar, aplicar a 9 PNG | Consistencia + sanitización |
| Catálogo | Crear/editar/borrar y regenerar campaña | Datos persistentes correctos |
| Campañas | 3 variantes x 3 formatos; archivos sin corrupción | ZIP 9 PNG, dimensiones comprobadas |
| Kits | Temporadas mexicanas, ausencia de contenido sin permiso | QA visual/manual |
| Calendario | Fechas de cambio horario, reprogramar, estados/exportar | Pruebas con timezone México |
| WhatsApp | Copiar/compartir manual, URL/texto codificado | Prueba móvil sin envío automático |
| Downgrade | Business -> Pro/Free, datos sobre cuota | Sin borrado automático; regla de lectura/exportación documentada |
| Auth | Sesión caducada, token manipulado, permisos obsoletos | 401/403; fail-closed |
| Pagos sandbox | Alta, pago aprobado, rechazado, duplicados, cancelación, renovación, refund, expiración | Trazas con cuentas ficticias |
| Operación | Backup+restauración, logs sin contenido privado, rollback | Ensayo en copia |
| Accesibilidad | Móvil/escritorio, teclado, alt/labels, textos largos y contrastes | E2E + revisión manual |

## E. Puertas de aprobación

**Gate 0:** respaldo/aislamiento verificados. **Gate 1:** módulos y RLS en entorno de ensayo. **Gate 2:** todas las pruebas de permisos y E2E en verde. **Gate 3:** compra/cancelación en sandbox, fiscalidad, proveedor en MXN, términos, soporte, privacidad y retención resueltos. **Gate 4:** autorización explícita nueva del propietario para habilitar pagos Live y cualquier campaña pagada.

Ningún paso anterior habilita automáticamente Gate 4. La matriz de seguridad histórica 80/80 no certifica estos módulos futuros.

## F. Pendientes definidos, sin decisión adicional implícita

- Proveedor apto para vender desde sociedad chilena a clientes en México con cobros y liquidaciones correctas.
- Límites de tamaño/cantidad de fotografías privadas, capacidad y costos mensuales (antes de almacenamiento persistente).
- Política de lectura/exportación/retención tras vencimiento y downgrade a Free.
- Conservar la promesa de «gratuito sin registro» incluso al añadir autenticación opcional.

Este documento es especificación de trabajo, no registro de implementación terminada.
