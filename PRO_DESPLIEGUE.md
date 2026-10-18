# Pago Pro: puesta en marcha segura

El checkout público sigue apagado (`proPaymentsEnabled:false`). El enlace `mpago.la` NO identifica al comprador con su cuenta Supabase.

## Para activarlo
1. Identificar `preapproval_plan_id` del plan CLP 4990 creado en Mercado Pago, usando API y credenciales productivas, no el enlace corto.
2. Guardar `MP_PREAPPROVAL_PLAN_ID` en los secretos de Supabase; no escribirlo en cliente.
3. Desplegar `promoflash-checkout` y probar con la sesión Supabase: debe verificar JWT, crear preapproval con `external_reference` y devolver `init_point`.
4. El webhook debe consultar API de Mercado Pago y correlacionar `external_reference` con usuario real; comprobar un pago aprobado *antes* de otorgar o renovar privilegios. Bloquear alteraciones y replays; revocar en cancelación.
5. Crear pruebas automatizadas para compra, pago rechazado, cancelación, refund, duplicados y expiración.
6. Desarrollar funcionalidades Pro reales y protegerlas del lado servidor. Hoy todas las plantillas Canvas están disponibles gratis.
7. Recién entonces cambiar `proPaymentsEnabled` a `true` y desplegar.

**No activar checkout ni anuncios hasta pasar todas las pruebas.**
