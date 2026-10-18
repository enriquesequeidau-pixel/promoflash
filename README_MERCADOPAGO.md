# Mercado Pago — PromoFlash Pro

Enlace público configurado: https://mpago.la/2iWVYnc

**Estado: cobros DESHABILITADOS en la web** (`config.js`: `proPaymentsEnabled: false`). No compartir el enlace con clientes hasta que las funcionalidades de Pro, la autenticación, la conciliación de suscripciones, cancelaciones y la entrega automática de acceso estén verificadas.

La página en GitHub Pages no puede consultar Mercado Pago de forma segura por sí sola. Es necesario un backend (p. ej. Supabase Edge Functions) con tokens privados guardados únicamente como secretos de servidor, que verifique por API el estado de suscripciones/cobros y vincule pagos a cuentas verificadas. No habilitar acceso basándose solo en la URL de regreso o en un correo enviado desde navegador.

Mercado Pago exige consultar y verificar pagos/suscripciones por API y notificaciones; revisar compatibilidad de tarjetas emitidas en México para las suscripciones de Chile antes de gastar en anuncios.

Pendientes: implementar función Pro real, autenticación, reconciliación segura, página de cuenta/cancelación, pruebas de pago y renovación, validación fiscal/privacidad y protección contra spam.

La configuración de cobros no se ha ejecutado; el usuario creó un plan de suscripción por su cuenta.
