# PromoFlash v2 — alcance comercial aprobado

**Fecha de aprobación:** 24 de octubre de 2026.
**Titular comercial:** Sequeidau Labs SpA.
**Mercado inicial:** México.
**Estado:** modelo y requisitos aprobados; nuevos módulos todavía NO implementados; sin cobros reales ni publicidad pagada habilitada.

## 1. Posicionamiento

«Una foto, promociones para vender durante toda la semana, sin saber diseñar».
Público: vendedores por Instagram y WhatsApp, microemprendedores mexicanos y pequeños negocios con varios productos; Business para quien administra hasta cinco marcas propias.

## 2. Planes mensuales aprobados

| Capacidad | Free | Pro | Business |
|---|---|---|---|
| Precio | MXN 0 | MXN 99/mes | MXN 199/mes |
| Editor actual, 3 diseños por tanda, 9 estilos, 5 rubros | Sí | Sí | Sí |
| Edición manual y exportación PNG / ZIP | Sí, sin registro | Sí | Sí |
| Inicio de sesión necesario | No | Sí | Sí |
| Marcas guardadas | — | 1 | 5 |
| Productos guardados | — | 50 | 250 en total |
| Campañas guardadas | — | 20 | 100 en total |
| Campañas completas | — | Sí | Sí |
| Kits de temporada | — | 4 iniciales | Todos los publicados |
| Calendario de publicaciones | — | De una marca | Separado por marca |
| Promociones para WhatsApp | — | Sí | Sí, por marca |
| Historial de campañas reutilizables | — | Sí | Sí |

**Los límites son de registros almacenados simultáneamente, NO consumos mensuales ni límite de descargas.** Borrar un producto o campaña propia libera cupo. Los cinco rubros del editor actual siguen disponibles en Free. Mantener capacidades Free existentes, sin imposición retroactiva de límites artificiales de diseño o descarga.

**Sin planes anuales, de por vida, cobros por créditos ni versiones para equipos multiusuario** en esta aprobación. Precios en MXN sujetos a comprobación del proveedor transfronterizo, impuestos y términos antes de activar checkout; jamás convertir silenciosamente la suscripción anterior CLP 4.990 en un plan MXN.

## 3. Los seis módulos aprobados

### A. Campañas completas
A partir de un producto y una intención («lanzamiento», «oferta», «últimos días»), preparar **3 variantes visuales en los 3 formatos actuales** (historia 1080×1920, post 1080×1350, cuadrado 1080×1080): hasta 9 PNG por campaña, un ZIP y textos comerciales editables. No prometer IA generativa.

### B. Catálogo de productos
Nombre, rubro, descripción, precio MXN, referencia opcional de foto y selección rápida desde el editor; crear, editar, duplicar y eliminar. Guardar y recuperar entre sesiones autenticadas. Pro 50 productos; Business 250 agregados entre marcas. Datos personales y fotografías privadas por defecto.

### C. Packs por fechas comerciales de México
Cuatro kits iniciales: Buen Fin, Hot Sale, Día de las Madres y Navidad. Incluir plantillas/estilos y titulares específicos, no marcas o campañas registradas de terceros sin permisos. Business obtiene todos los kits publicados en el servicio. Si inicialmente solo existen cuatro, el acceso a kits será igual en Pro y Business: sus diferenciales iniciales reales serán los límites y las cinco marcas.

### D. Calendario de publicaciones
Vistas semanal y mensual para campañas guardadas; asignar/reprogramar fecha, estado pendiente/publicado, duplicar una entrada, exportar calendario o lista. Se considera una herramienta de **planificación manual**, NO publicación automática en redes.

### E. Identidad de marca
Nombre comercial, logotipo opcional, colores, teléfono/enlace comercial y estilo; aplicación consistente a diseños. Pro una marca; Business hasta cinco marcas con catálogos, campañas y calendarios separados.

### F. Promociones para WhatsApp
Generar imagen, titular, precio, texto comercial, botón para copiar mensaje e invocación del compartir manual (si existe en el dispositivo). NO hacer envíos masivos, mensajes automáticos ni acceso a credenciales de WhatsApp.

## 4. Política comercial y retención pendientes de ratificación operativa

- La cancelación elimina la renovación futura según el proveedor; la vigencia del acceso pagado depende del período efectivamente abonado y reconciliado.
- Los archivos PNG/ZIP ya descargados siguen perteneciendo al usuario.
- Al bajar de Business a Pro o Free **no eliminar automáticamente** marcas, productos, campañas o fotografías; diseñar lectura/exportación de datos y un modo sin edición premium hasta regularizar el plan.
- Definir explícitamente plazos de retención y exportación de datos en términos/privacidad antes de activar pagos.
- El almacenamiento persistente de fotos en nube NO está aprobado automáticamente; si se incorpora, debe quedar como opción voluntaria y documentada con cuotas.
- No prometer aumento de ventas, funciones de IA ni publicación automatizada.

## 5. Qué existe hoy vs. qué es nuevo

**Implementado en repositorio:** editor Free, 3 diseños por tanda, 9 estilos, 5 rubros, tres formatos, PNG/ZIP, procesado local de fotos; archivos de cuenta/autenticación, estructuras de derechos Pro y función parcial de marca/titulares.

**Por construir y probar:** catálogo persistente, campaña multiformato, kits comerciales, calendario, WhatsApp comercial, aislamiento de varias marcas, límites de planes, migración de entitlements a tres niveles, precio/checkout México e interfaz Pro/Business completa. La presencia de código no equivale a validación de producción.

**Bloqueos:** proveedor aprobado que pueda cobrar desde Sequeidau Labs SpA a usuarios mexicanos en MXN; pruebas completas de alta, pago aprobado, webhooks, cancelación, reintentos, fraude, expiración y reembolso; textos legales y operación tributaria. `proPaymentsEnabled=false` y, en el backend, `PF_CHECKOUT_ENABLED` debe permanecer deshabilitado.

## 6. Criterio de cierre comercial

La propuesta queda **APROBADA PARA IMPLEMENTACIÓN Y QA**, no aprobada para venta real.
Solo una autorización posterior y explícita permitirá activar cobros o publicidad pagada.
Ver `PROMOFLASH_V2_PLAN_TECNICO_QA.md` para secuencia y controles.
