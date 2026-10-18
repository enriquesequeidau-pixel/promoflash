# Microcampaña inicial — PromoFlash

**Estado:** NO ACTIVAR hasta contar con analítica de conversiones funcionando, privacidad y formulario registrados, y elegir un objetivo coherente. Sin acceso a Meta Ads, nada de esto está activado.

## Producto y oferta
- Producto: editor de 3 promociones gratis, demostración inmediata.
- Segmento inicial: pequeñas tiendas de cosmética / belleza que publican ofertas en Instagram en México.
- CTA: «Crea 3 publicaciones con la foto de tu producto. Gratis».
- Página de destino: https://enriquesequeidau-pixel.github.io/promoflash/
- Campaña UTM: ?utm_source=meta&utm_medium=paid_social&utm_campaign=mx_beauty_test_01&utm_content=creative_01
- País: México. No mezclar segmentos y países en este presupuesto.

## Presupuesto con límite
1. Primera prueba: US$10 de presupuesto TOTAL, 2 creatividades, una campaña, ventana de 3–5 días.
2. Reservar US$20–40 para modificar creatividad o posicionamiento solo después de comprobar eventos.
3. Pausar manualmente tras analizar visitas > clic al editor > descarga > registros. No optimizar por compra si no hay compras activas.

## Creatividades (15 segundos, vertical)
- A: 0–3s «¿Tus fotos no venden lo que merecen?»; 3–7s foto de producto sin diseño; 7–12s tres resultados reales; 12–15s «Haz tus 3 promos gratis».
- B: 0–4s «3 historias diferentes con una sola foto»; 4–11s pantallazo REAL del editor y descarga; 11–15s «Pruébalo gratis».
- Visuales de anuncios: capturas de /assets/demo*.png o screencast del editor. No inventar reseñas, ventas logradas, cifras o urgencia.

## Señales a medir
- La visita a la landing (GA4 `page_view` tras consentimiento).
- Clic `hero_demo` / `nav_demo` / `samples_demo` (instrumentados).
- `promo_download_all` y `promo_download` desde editor (instrumentar solo si aceptan analítica).
- `lead_submitted` al guardar con éxito en Supabase.

Un presupuesto de US$10 ofrece una señal exploratoria, no prueba sólida del CAC ni de la rentabilidad. No cobrar por el plan Pro hasta habilitar el producto de pago y el cumplimiento correspondiente.
