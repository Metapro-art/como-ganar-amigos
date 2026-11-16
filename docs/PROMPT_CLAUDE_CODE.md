# Proyecto: sitio web «Cómo ganar amigos» — tarjetas de referencia rápida

Actúa como mi desarrollador frontend senior y diseñador. Vamos a construir y publicar un sitio web estático, bonito y rápido, para navegar unas tarjetas-imagen con los principios del libro *Cómo ganar amigos e influir sobre las personas* de Dale Carnegie. Escribe todo en español: respuestas, textos del sitio, documentación y mensajes de commit.

---

## 0. Regla de oro: la cuenta de GitHub es **Metapro-art**

En este PC hay dos cuentas de GitHub: **Metapro-art** (la de este proyecto) y **groovesart** (otra, no se toca).

Antes del primer commit y antes de cada `push`, verifica:

1. `gh api user --jq .login` debe devolver `Metapro-art`.
2. `git config user.name` y `git config user.email` (configuración local de este repo) deben ser de Metapro-art. El email termina en `@users.noreply.github.com`.

Si algo no coincide, **detente y avísame**. No cambies de cuenta, no toques credenciales, no modifiques la configuración global de git y no uses `gh auth switch` por tu cuenta.

---

## 1. Qué hay en esta carpeta (`D:\WebpageComoganarAmigos`)

- **43 imágenes PNG** verticales de 1440 × 2560 px. Cada nombre empieza con su número de orden de dos dígitos (00–42):
  - `00`: mapa con los 30 principios
  - `01`, `05`, `12`, `25`: portadas de las Partes 1 a 4
  - `02–04`, `06–11`, `13–24`, `26–34`: los 30 principios
  - `35`: portada de la Parte 6 (*Siete reglas para hacer más feliz tu vida en el hogar*, de la edición original)
  - `36–42`: las 7 reglas
- **`cards.json`**: la fuente de verdad. Tiene, por cada tarjeta, el archivo, la sección, el color, el título, la definición, «Cómo aplicarlo» y un texto alternativo. Úsalo para títulos, `alt`, búsqueda y enlaces. **No inventes ni reescribas esos textos.**
- **`PROMPT_CLAUDE_CODE.md`**: este documento.
- Puede haber un `.zip` con las mismas imágenes: no lo subas al repo.

Empieza haciendo un inventario: empareja cada PNG con `cards.json` por el prefijo numérico y repórtame si falta o sobra algo antes de seguir.

---

## 2. Objetivo

Un sitio donde cualquiera entra y recorre las 43 tarjetas de forma fluida y agradable, sobre todo desde el celular. Se publica gratis en GitHub Pages, en un repo público nuevo:

- Repo: `Metapro-art/como-ganar-amigos`
- URL: `https://metapro-art.github.io/como-ganar-amigos/`

Lo voy a seguir mejorando en futuras sesiones, así que el código debe ser simple, ordenado y fácil de extender.

---

## 3. Stack y estructura

- HTML + CSS + JavaScript sin framework (módulos ES). **Sin paso de build**: GitHub Pages sirve los archivos tal cual.
- Usa siempre rutas relativas, porque el sitio vive en la subruta `/como-ganar-amigos/`.
- Estructura:

```
index.html
404.html
.nojekyll
.gitignore
assets/css/styles.css
assets/js/app.js          (más módulos pequeños si hace falta: data.js, viewer.js, search.js)
assets/icons/favicon.svg
data/cards.json
images/original/          ← los PNG (moverlos, no copiarlos; sirven para descargar)
images/large/             ← WebP de 1080 px de ancho, calidad ~85
images/thumb/             ← WebP de 400 px de ancho, calidad ~80
tools/                    ← script para regenerar los WebP
docs/PROMPT_CLAUDE_CODE.md
CLAUDE.md
ROADMAP.md
README.md
```

- Genera los WebP con lo que haya en el equipo (Node + sharp, o Python + Pillow) y deja el script en `tools/` para poder regenerarlos cuando agregue tarjetas. Si no hay ni Node ni Python, pídeme permiso para instalar Node LTS (`winget install OpenJS.NodeJS.LTS`).
- `.gitignore`: `*.zip`, `node_modules/`, `Thumbs.db`, `.DS_Store`.

---

## 4. Diseño: que se sienta de la misma familia que las tarjetas

- Estética editorial cálida, de libro clásico, pero moderna y limpia. Nada de plantilla genérica.
- Colores base: papel `#F4EDE1`, tinta `#231F19`, texto secundario `#6B6256`.
- Color de cada sección (están en `cards.json`): Parte 1 terracota `#A3402A`, Parte 2 ocre `#946311`, Parte 3 verde azulado `#1F5A5C`, Parte 4 morado `#4B3466`, Hogar vino `#8E3A59`.
- Tipografías de Google Fonts con `display=swap`: **Fraunces** para títulos y números grandes, **Hanken Grotesk** para el texto.
- Usa números grandes en Fraunces como elemento gráfico, igual que en las portadas. Mucho aire, bordes redondeados suaves y sombras sutiles.
- Mobile-first. Debe verse impecable a 360, 768 y 1440 px de ancho.

---

## 5. Funcionalidades (versión 1)

1. **Inicio (hero)**: título del libro, autor y una línea que explique el sitio («30 principios y 7 reglas en tarjetas de referencia rápida»). Botón **Empezar**, que abre el visor en el mapa, y botón **Sorpréndeme**, que abre una tarjeta al azar.
2. **Navegación por secciones**: chips con el color de cada sección (Todas, Mapa, Parte 1, 2, 3, 4, Hogar). La barra queda fija arriba al hacer scroll.
3. **Galería**: miniaturas agrupadas por sección. Cada grupo lleva un encabezado con número grande, nombre y resumen de la parte en su color. Usa 2 columnas en celular, 3–4 en tablet y 5–6 en escritorio. Debajo de cada miniatura van el número y el título corto. Carga diferida (lazy loading) con `width` y `height` para que nada salte al cargar.
4. **Visor a pantalla completa** al tocar una tarjeta:
   - Imagen grande ajustada a la pantalla, sobre fondo oscuro cálido.
   - Anterior y siguiente con botones, flechas del teclado y deslizando el dedo (swipe). Se cierra con Esc o con un botón.
   - Contador («12 / 43») y nombre de la sección con su color.
   - Precarga la tarjeta anterior y la siguiente.
   - Botón **Ver texto**: un panel con título, definición y «Cómo aplicarlo» (desde el JSON), para leer o copiar.
   - Botón **Descargar** (el PNG original) y botón **Compartir** (Web Share API; si no existe, copia el enlace y muestra un aviso).
   - Cada tarjeta tiene su propia URL con hash usando su `id` del JSON (ej. `#/p2-2` abre «Sonríe»). Al compartir o recargar se abre esa tarjeta, y el botón Atrás del navegador cierra el visor.
   - Transiciones suaves que respetan `prefers-reduced-motion`.
5. **Búsqueda en vivo** por título, definición y acciones, sin distinguir tildes ni mayúsculas, con los resultados en la misma galería.
6. **Accesibilidad**: `alt` desde el JSON, todo usable con teclado y foco visible. El visor es `role="dialog"` con el foco atrapado. Contraste AA.
7. **SEO y compartir**: `lang="es"`, título y descripción, Open Graph y Twitter Card con el mapa como imagen, un favicon SVG sencillo (por ejemplo una «C» en Fraunces sobre terracota) y un `404.html` que lleve al inicio.

---

## 6. Calidad antes de publicar

- Pruébalo con un servidor local (`npx serve` o `python -m http.server`) y dame la URL local para que yo lo revise en mi navegador. **Espera mi OK antes de publicar.**
- Comprueba que no haya errores en la consola, que carguen las 43 tarjetas, que el visor funcione con teclado y con swipe, y que se vea bien a 360, 768 y 1440 px. Si puedes, toma capturas con Playwright y revísalas tú mismo.
- Cuida el peso: la página inicial no debe descargar imágenes grandes, solo las miniaturas visibles.

---

## 7. Publicar

1. Vuelve a verificar la regla de oro (paso 0).
2. Crea el repo y sube todo:
   `gh repo create Metapro-art/como-ganar-amigos --public --source=. --remote=origin --push --description "Tarjetas de referencia rápida de Cómo ganar amigos e influir sobre las personas"`
3. Activa GitHub Pages desde la rama `main`, carpeta raíz. Por ejemplo:
   `gh api -X POST repos/Metapro-art/como-ganar-amigos/pages -f "source[branch]=main" -f "source[path]=/"`
   Si falla, dime exactamente qué hacer en Settings → Pages.
4. Espera a que el sitio responda y dame la URL final.

Haz commits pequeños con mensajes claros en español. Nunca uses `push --force` ni reescribas el historial.

---

## 8. Memoria del proyecto (para seguir mejorándolo)

- **`CLAUDE.md`**: qué es el proyecto, la estructura, cómo agregar o cambiar tarjetas (actualizar `cards.json` + imágenes + regenerar los WebP con el script de `tools/`), colores y tipografías, cómo probar y publicar, y la regla de oro de la cuenta Metapro-art.
- **`ROADMAP.md`** con las próximas fases marcadas como pendientes, por ejemplo:
  - app instalable que funcione sin internet (PWA)
  - «principio del día»
  - modo práctica tipo flashcards: ver el título y recordar la definición
  - favoritos y progreso guardados en el navegador (localStorage)
  - modo oscuro
  - versión en texto HTML de cada tarjeta, para SEO
  - dominio propio
- **`README.md`** corto: URL del sitio, cómo correrlo localmente y una nota de que es un resumen personal de estudio, sin afiliación con los titulares del libro.

---

## Forma de trabajar

- Empieza mostrándome un plan breve (máximo 10 líneas) y luego avanza sin esperar.
- Detente solo para: (1) cualquier problema con la cuenta de GitHub, (2) pedirme permiso para instalar algo, (3) que yo revise antes de publicar.
- Si algo es ambiguo, decide lo más sensato, anótalo en `ROADMAP.md` y sigue.
