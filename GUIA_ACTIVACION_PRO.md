# PromoFlash v0.9 — Cuentas

## Ya implementado
- Alta de usuario, inicio y cierre de sesión en `cuenta.html` / `cuenta.js`.
- Confirmación por correo según configuración de Supabase Auth.
- Consulta protegida de `pro_entitlements` mediante políticas RLS del servidor.
- El editor gratis sigue abierto sin iniciar sesión.
- Cobros Pro siguen DESHABILITADOS en `config.js`.

## Obligatorio antes de publicar
1. Subir archivos del ZIP al repositorio, incluida la página `cuenta.html` y `cuenta.js`.
2. Supabase Dashboard > Authentication > URL Configuration: Site URL `https://enriquesequeidau-pixel.github.io/promoflash/` y Redirect URLs `https://enriquesequeidau-pixel.github.io/promoflash/**` (ajustar según patrones admitidos).
3. Comprobar email de confirmación y que un usuario nuevo pueda iniciar/cerrar sesión y vea `Plan gratis`.
4. No publicar el checkout como Pro automático hasta vincular identity/email con una suscripción real, validar pagos y revocación.
5. Confirmar condiciones del correo SMTP y límites de envío para producción.
6. Cambiar el dominio en cualquier rebranding.

## Nota de seguridad
La clave de Supabase en config.js es pública; no agregar jamás `service_role`, `MP_ACCESS_TOKEN` ni `MP_WEBHOOK_SECRET` a archivos web. La consulta del estado Pro no concede permisos de escritura al usuario.
