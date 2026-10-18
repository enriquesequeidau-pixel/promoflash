# PromoFlash: estado verificado de la integración (v1.1)

- Base de datos de usuarios, links de suscripción, entitlements y marca Pro creadas con RLS.
- Función promoflash-pro-studio desplegada; solo genera titulares y guarda marca tras validar acceso Pro activo.
- Función promoflash-checkout desplegada, pero intencionalmente bloqueada a menos que se configure PF_CHECKOUT_ENABLED=true en Supabase. NO ACTIVAR antes de prueba completa.
- Webhook valida firma e intenta conciliar eventos subscription_preapproval. No se ha probado un pago completo. Eventos de otros tipos aún no cambian el estado y requieren conciliación periódica.
- El registro y el acceso gratuito funcionan. El plan de Mercado Pago es CLP 4990 mensual, pero NO se ha hecho una compra exitosa ni comprobado una cancelación.
- El checkout requiere validación de alta, autorización, devolución, reintentos y persistencia frente a fallas del proveedor antes de habilitar cargos.
- v1.1 NO está publicada; GitHub requiere un commit del usuario o permisos de escritura adicionales.
- No ejecutar anuncios de suscripciones aún. Se puede validar demanda del editor gratuito antes de habilitar el cobro.
- La función Pro genera 3 titulares y guarda marca: no es IA generativa, ni habilita todas las funciones del editor como exclusivas.
