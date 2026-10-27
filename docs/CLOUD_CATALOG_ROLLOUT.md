# PromoFlash — catálogo privado (PR, NO desplegado)

## Alcance

- Guardar, abrir, actualizar y eliminar fichas de producto desde `editor.html` cuando existe una sesión de PromoFlash.
- Solo texto (nombre, precio, marca, oferta, categoría y copy); **ninguna fotografía** se envía o persiste en Supabase.
- Al abrir una ficha, la fotografía anterior se borra del editor para evitar mezclar imágenes de productos.
- RLS por `auth.uid() = user_id` en las cuatro operaciones; sin acceso de `anon`.
- El editor gratuito sigue funcionando sin login, sin cargar SDK de autenticación para visitantes anónimos.
- No incluye campañas persistentes, Business, checkout ni límites de plan. No implica que Pro/Business esté comercialmente listo.

## Orden de despliegue (requiere revisión)

1. Revisar el SQL `migrations/20261026_pf_catalog.sql` y su compatibilidad con el proyecto Supabase de cuentas existente.
2. Ejecutar la migración en un entorno de prueba, no en producción. Verificar políticas y permisos efectivos de roles `anon` y `authenticated`.
3. Ejecutar `node --test tests/catalog.test.mjs` y la suite completa del repositorio; confirmar CI verde sin forzar workflows privados con presupuesto agotado.
4. QA en navegador real con **dos cuentas ficticias**: crear/editar/leer/eliminar, recarga, otra pestaña, cierre de sesión, sesión vencida, acceso cruzado denegado, entrada inválida, carga sin red y foto anterior borrada.
5. Confirmar RLS con solicitudes REST como cada usuario y como anónimo; comprobar que las fotos nunca salen del dispositivo.
6. Solo después de aprobar los puntos anteriores, aplicar migración en producción y desplegar el frontend; revisar logs y errores.
7. Si se necesita rollback del frontend, revertir el PR. **No borrar la tabla** con datos de usuarios sin un plan de retención/exportación aprobado.

## Limitaciones conocidas

- La interfaz muestra las 100 fichas más recientes por usuario; falta paginación para cuentas grandes.
- Las fotos deben seleccionarse nuevamente cada vez. La sincronización guarda solo campos de texto.
- La función requiere conexión, sesión válida y el esquema desplegado; no hay modo offline de catálogo.
- Los tests actuales validan contrato, privacidad y wiring estático; **no** reemplazan el ensayo RLS ni E2E de navegador.

## Seguridad

No usar `service_role` en el navegador. No modificar `pro_entitlements`, precios ni flags de pagos. No subir fotos privadas a repositorios, almacenamiento público ni tablas. Los datos de prueba deben ser ficticios.
