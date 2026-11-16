# CLAUDE.md — memoria del proyecto

Sitio web estático con las 43 tarjetas-imagen de *Cómo ganar amigos e influir sobre las personas* (Dale Carnegie): un mapa, 5 portadas, 30 principios y 7 reglas. Se publica gratis en GitHub Pages:

- Repo: `Metapro-art/como-ganar-amigos` (público)
- URL: <https://metapro-art.github.io/como-ganar-amigos/>

Todo se escribe **en español**: textos del sitio, documentación, comentarios y mensajes de commit.

## Regla de oro: la cuenta de GitHub es Metapro-art

En este PC hay dos cuentas de GitHub: **Metapro-art** (la de este proyecto) y **groovesart** (otra, no se toca). Antes de cada commit y de cada `push`, verifica:

1. `gh api user --jq .login` devuelve `Metapro-art`.
2. `git config user.name` y `git config user.email` (configuración **local** del repo) son de Metapro-art. El email termina en `@users.noreply.github.com`.

Si algo no coincide, **detente y avisa**. No cambies de cuenta, no toques credenciales, no modifiques la configuración global de git y no uses `gh auth switch`. Nunca uses `push --force` ni reescribas el historial.

## Estructura

```
index.html              Página única: hero, barra de secciones, galería y visor (<dialog>)
404.html                Autocontenida (estilos en línea): GitHub Pages la sirve a cualquier profundidad
manifest.webmanifest    App instalable: nombre, iconos, colores y acceso directo al mapa
sw.js                   Service worker: instalación y uso sin conexión (ver «App instalable»)
.nojekyll               GitHub Pages sirve los archivos tal cual (sin Jekyll)
assets/css/styles.css   Estilos; paleta y tipografías en las variables de :root
assets/js/app.js        Entrada: carga datos, pinta la galería, filtros, búsqueda y rutas (#/id)
assets/js/data.js       Carga cards.json, rutas de imágenes, textos derivados y color accesible por sección
assets/js/gallery.js    Chips, grupos con miniaturas (carga diferida) y abanico de portadas del inicio
assets/js/viewer.js     Visor a pantalla completa: teclado, swipe, panel de texto, descargar y compartir
assets/js/search.js     Normalización (sin tildes ni mayúsculas) y coincidencia por inicio de palabra
assets/js/ui.js         Avisos (toast), portapapeles y escape de HTML
assets/js/install.js    Registra el service worker y maneja el botón «Instalar como app»
assets/icons/           favicon.svg, apple-touch-icon.png (180) e iconos de la app (192, 512 y maskable 512)
assets/img/og.jpg       Imagen para compartir en redes (1200 × 630)
data/cards.json         FUENTE DE VERDAD de las tarjetas
images/original/        PNG originales 1440 × 2560 (se ofrecen para descargar)
images/large/           WebP de 1080 px de ancho, calidad 85 (visor)
images/thumb/           WebP de 400 px de ancho, calidad 80 (galería)
tools/generar-webp.mjs  Valida cards.json y genera los WebP con ffmpeg
tools/servidor.mjs      Servidor local que imita GitHub Pages (subruta + 404)
tools/og.html           Plantilla de la imagen para compartir
docs/PROMPT_CLAUDE_CODE.md  Encargo original del proyecto
```

Convenciones: HTML, CSS y JavaScript sin framework, con módulos ES. **Sin paso de build y sin dependencias de npm.** Usa siempre **rutas relativas**, porque el sitio vive en la subruta `/como-ganar-amigos/`. La única excepción son las URL absolutas de `og:image`, `og:url` y `canonical` en `index.html`.

## Datos: `data/cards.json`

- Es la fuente de verdad de títulos, definiciones, «Cómo aplicarlo», textos alternativos, colores y orden. **No inventes ni reescribas esos textos.** El código solo los lee.
- `sections[]` define cada sección con su `id`, `label`, `name`, `summary`, `color`, `unit` y `count`. La etiqueta del chip es «Parte N» por defecto; las excepciones (`mapa` → «Mapa», `hogar` → «Hogar») están en `CHIP_LABELS`, en `assets/js/data.js`.
- `cards[]` tiene, por cada tarjeta, `order`, `id`, `file`, `type` (`mapa` | `portada` | `principio` | `regla`), `section`, `number`, `title`, `subtitle`, `short`, `definition`, `howTo[]` y `alt`.
- El `id` forma la URL de la tarjeta (`#/p2-2` abre «Sonríe»). **No cambies los `id` existentes**, porque romperías los enlaces que la gente ya compartió.

## Cómo agregar o cambiar tarjetas

1. Pon el PNG (1440 × 2560) en `images/original/`. El nombre empieza con su número de orden de dos dígitos, por ejemplo `43_…png`. Para cambiar una tarjeta, reemplaza el PNG con el mismo nombre.
2. Agrega o edita su entrada en `data/cards.json` (`order`, `id`, `file`, `type`, `section`, textos y `alt`). Si es una sección nueva, agrégala a `sections[]` con su color.
3. Regenera los WebP: `node tools/generar-webp.mjs`. El script solo crea los que faltan o cuyo PNG cambió; con `--todas` los regenera todos. También avisa de ids repetidos, PNG faltantes y archivos sobrantes.
4. Prueba en local (ver abajo) y haz commit de PNG, WebP y JSON juntos.

El script requiere **ffmpeg con libwebp** en el PATH (en Windows: `winget install Gyan.FFmpeg`). Si ffmpeg está en otra ruta, defínela en la variable de entorno `FFMPEG`.

## Diseño

- Estética editorial cálida, de la misma familia que las tarjetas: números grandes en Fraunces como elemento gráfico, mucho aire, bordes redondeados suaves y sombras sutiles. Mobile-first; revisar siempre a 360, 768 y 1440 px.
- **Tema oscuro cálido**: es la paleta de las tarjetas invertida, para que las tarjetas crema resalten como sobre una mesa. Los valores están en las variables de `:root` de `styles.css`:
  - fondo `#1A1612`;
  - superficies `#231F19` (la tinta de las tarjetas) y `#2E2822`;
  - fondo del visor `#100D0A`;
  - texto `#F4EDE1` (el papel) y texto secundario `#B5AA9A`, con 7,9:1 sobre el fondo.
- Colores de las tarjetas (en `cards.json`): papel `#F4EDE1` y tinta `#231F19`. Colores de sección: Parte 1 terracota `#A3402A`, Parte 2 ocre `#946311`, Parte 3 verde azulado `#1F5A5C`, Parte 4 morado `#4B3466`, Hogar vino `#8E3A59`.
  - Sobre el fondo oscuro, esos colores son ilegibles como texto (el morado queda en 1,7:1). Por eso, en CSS cada sección recibe dos variables:
    - `--c`: el color original, para rellenos, resplandores y el fondo de las miniaturas mientras cargan.
    - `--c-text`: una variante más clara del mismo tono que `data.js` calcula para lograr contraste AA (coral `#D67762`, dorado `#C68517`, turquesa `#37A1A4`, lavanda `#A186C1` y rosa `#C97A97`). El mapa, que es casi gris, usa el papel.
  - Si cambias el fondo o las superficies, actualiza `TEXT_SURFACE` en `data.js`.
- Tipografías (Google Fonts, `display=swap`): **Fraunces** para títulos y números, con el eje SOFT fijo en 100 (los números redondeados de las portadas), y **Hanken Grotesk** para el texto. La hoja de Google Fonts se carga **sin bloquear el pintado** (`preload` + `media="print"`), así que con mala señal la página se ve igual, con fuentes de respaldo.

## Comportamiento que conviene conservar

- **Rutas:** abrir el visor hace `pushState('#/id')`, y moverse entre tarjetas hace `replaceState`. Así el botón Atrás del navegador (y el gesto «atrás» de Android) **cierra el visor**. Si se entró directo con un enlace a una tarjeta, cerrar solo limpia el hash.
- **Visor:** `<dialog>` modal con foco atrapado. Esc cierra, ← → navegan y el swipe funciona con el dedo o arrastrando con el ratón. Precarga la tarjeta anterior y la siguiente y muestra la miniatura mientras carga la grande. Recorre las 43 tarjetas en orden; el contador es global.
- **Panel «Ver texto»:** en el celular reemplaza la imagen; desde 1024 px va al lado. En el mapa y las portadas, lista los principios con enlaces.
- **Compartir:** usa la Web Share API; si no existe, copia el enlace y muestra un aviso. **Descargar** entrega el PNG original.
- **Peso:** la carga inicial solo pide las 5 miniaturas del abanico y las visibles. Las demás se piden con `IntersectionObserver` (margen de 300 px, en `gallery.js`). Las imágenes grandes solo se cargan en el visor.
- **Búsqueda:** en vivo, sin tildes ni mayúsculas, por inicio de palabra, en título, definición y acciones. Se combina con el chip de sección activo. «/» enfoca el buscador.
- **Accesibilidad:** `alt` desde el JSON, foco visible, contraste AA, `prefers-reduced-motion` respetado y avisos con `aria-live`.
- **Celular:**
  - Objetivos táctiles de al menos 44 px (los chips miden 44 px en pantallas táctiles) y letra mínima de 12 px.
  - `touch-action: manipulation`, para que tocar rápido no haga zoom en iOS.
  - Efectos *hover* solo con puntero (`@media (hover: hover)`), para que no se queden «pegados» al tocar.
  - Botones del inicio a lo ancho en teléfonos y visor compacto con el teléfono en horizontal (solo iconos).
  - `theme-color` oscuro y `html` con el color de fondo, para que no haya destellos claros al rebotar en iOS.
  - El buscador usa letra de 16 px, así iOS no hace zoom al enfocarlo.

## App instalable (PWA)

- Se puede instalar como app o acceso directo en el celular. En Android y en Chrome o Edge de computador aparece el botón «Instalar como app» del inicio, que abre el aviso del navegador. En iPhone, el botón explica cómo hacerlo: Compartir → «Agregar a inicio». Abierta como app, el botón no aparece.
- `sw.js` maneja la caché así:
  - **Páginas, estilos, JS y `cards.json`:** primero la red y, sin conexión, la copia guardada. Por eso los cambios publicados se ven de inmediato.
  - **Imágenes y fuentes:** primero la copia guardada. Se guardan a medida que se ven, así que sin conexión está disponible lo ya visitado.
- **Al agregar un módulo JS nuevo,** súmalo a `SHELL_FILES` en `sw.js`, porque `cache.addAll` falla si falta uno, y al `modulepreload` de `index.html`.
- **Al reemplazar una imagen conservando su nombre,** sube `IMAGES_CACHE` en `sw.js` (por ejemplo, `imagenes-v2`).
- **Iconos:** salen de `favicon.svg`. El maskable es el mismo dibujo a sangre, porque la «C» ya cabe en la zona segura. Para regenerarlos, haz una captura del SVG a 192 y 512 px con Playwright, con fondo transparente.

## Probar

1. `node tools/servidor.mjs` y abre <http://localhost:8080/como-ganar-amigos/>.
2. Revisa que la consola no tenga errores y que carguen las 43 tarjetas.
3. Prueba el visor con teclado (Tab, ← →, Esc) y con swipe, el botón Atrás, un enlace directo como `#/p2-2`, la búsqueda (por ejemplo «sonrie», sin tilde) y los chips.
4. Mira el sitio a 320, 360, 390 y 768 px, con un teléfono en horizontal (740 × 360) y a 1440 px. Comprueba que no haya desplazamiento horizontal y que la tarjeta del visor quepa completa entre las barras.

Con Playwright, `npx playwright screenshot --viewport-size "360, 740" <url> captura.png` saca capturas rápidas. En la v1 se usó además un script de pruebas fuera del repo; agregarlo al repo está en el ROADMAP.

## Publicar

GitHub Pages publica automáticamente desde la rama `main`, carpeta raíz:

1. Verifica la regla de oro (arriba).
2. Haz commits pequeños con mensajes claros en español.
3. `git push`. El sitio se actualiza en uno o dos minutos.

Si se cambia el nombre del repo o se usa un dominio propio, actualiza las URL absolutas de `index.html` (`canonical`, `og:url`, `og:image`, `twitter:image`) y la constante `REPO` de `404.html`.

La imagen para compartir se regenera siguiendo las instrucciones del comentario de `tools/og.html`.
