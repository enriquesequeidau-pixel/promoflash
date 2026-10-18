# PromoFlash Studio — v0.6

Landing y editor de promociones totalmente estáticos. Publicación gratuita con GitHub Pages, sin compilación, API de IA ni backend necesario para las descargas.

## Lo nuevo

- Experiencia "una foto → tres promos": 3 diseños aparecen automáticamente, sin registro.
- 5 rubros: belleza, moda, joyas, comida, hogar.
- 9 composiciones visuales distintas (3 por tanda, botón para descubrir más).
- Ejemplos ilustrados sin necesidad de usar una foto real para explorar la app.
- Personalización opcional (precio, antes, tienda, etiqueta, título y llamada a la acción).
- Formatos: Historia 1080×1920, Post 1080×1350 y Cuadrado 1080×1080.
- PNG individual; las tres en un ZIP válido, sin librerías externas.
- Carga y procesamiento local de fotos. La foto no se envía a un servidor.
- Landing renovada con imágenes creadas en el editor real.

## Publicar en GitHub Pages

1. Descomprime `PromoFlash_v06.zip` en tu computadora.
2. Abre tu repositorio GitHub: `https://github.com/enriquesequeidau-pixel/promoflash`.
3. En la rama `main`, sube **todos los archivos y la carpeta `assets`** a la raíz del repositorio, reemplazando los anteriores. No subas el ZIP como único archivo.
4. Confirma el commit.
5. Si Pages estaba configurado como `Deploy from a branch / main / (root)`, GitHub publicará la nueva versión automáticamente al completar el despliegue.
6. Prueba estas rutas:
    - `https://enriquesequeidau-pixel.github.io/promoflash/`
    - `https://enriquesequeidau-pixel.github.io/promoflash/editor.html`

Si la versión anterior sigue visible, espera al despliegue y haz una recarga forzada.

## Archivos

- `index.html`, `landing.css`, `landing.js`: landing comercial.
- `editor.html`, `editor.css`, `editor.js`: app de diseño.
- `assets/demo1.png` a `assets/demo3.png`: ejemplos reales generados a partir del editor (ilustraciones ficticias, no productos de un cliente).
- `config.js`: configuración opcional de Supabase y Plausible, sin claves secretas.
- `schema.sql`, `migration_v03.sql`: scripts SQL para lista de espera.

## Captura de interesados (opcional; NO está activa por defecto)

1. Crea un proyecto Supabase propio y ejecuta `schema.sql` en SQL Editor. Si ya tenías la tabla de una versión anterior, revisa si debes aplicar `migration_v03.sql`.
2. Revisa las políticas RLS y las medidas contra abuso. La política de ejemplo permite insertar registros anónimos y **no incluye CAPTCHA ni limitación de frecuencia**. No habilites un formulario público sin controles de spam adecuados.
3. Publica el aviso de privacidad, datos de contacto del responsable y mecanismo real para solicitar eliminación de datos antes de recopilar correos.
4. Completa `supabaseUrl` y `supabaseAnonKey` en `config.js`. Usa solamente una clave pública (publishable/anon), nunca `service_role`.
5. Prueba el formulario y comprueba el registro en Supabase.

Para analítica con Plausible, completa `plausibleDomain` en `config.js`. Eventos: `demo_click`, `waitlist_click`, `waitlist_submitted`, `select_category`, `photo_uploaded`, `promo_generate`, `promo_remix`, `promo_download`, `promo_download_all`.

## Límites honestos

- Las plantillas son programáticas, **no usan inteligencia artificial generativa**.
- No hay pagos habilitados ni plan Pro funcional. US$4,99/mes es solo una hipótesis de precio.
- Sin cuentas, historiales en la nube ni límites de descarga; esta versión es para validar interés. El estado de textos básicos se guarda únicamente en el navegador (localStorage), no la foto.
- Si quieres cobrar en el futuro, hará falta autenticación, infraestructura para pagos y control de permisos en un backend.
- Antes de gastar en anuncios, confirma en un navegador real que el formulario y la analítica estén conectados, y comprueba la política de publicidad y privacidad correspondiente.

## Pruebas ejecutadas

- Carga de editor, categorías, formatos y vistas móviles: sin errores JS en Chromium.
- Subida de foto local JPG/PNG: confirmada con PNG.
- Exportación ZIP de las tres promociones: probada y validada con `zipfile` de Python (3 PNG, CRC correcto).
- Landing probada en escritorio y móvil.
