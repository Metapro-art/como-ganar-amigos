# ROADMAP

## Versión 1

- [x] Inicio con título, autor, «Empezar» (abre el mapa) y «Sorpréndeme» (tarjeta al azar)
- [x] Barra fija con chips por sección y búsqueda en vivo
- [x] Galería agrupada por sección, con encabezados de número grande y carga diferida
- [x] Visor a pantalla completa: teclado, swipe, contador, precarga, «Ver texto», descargar, compartir y URL propia por tarjeta
- [x] Accesibilidad (foco atrapado, foco visible, contraste AA, movimiento reducido), SEO básico, Open Graph, favicon y 404
- [x] Tema oscuro cálido, con variantes claras de los colores de sección para mantener el contraste AA
- [x] Revisión móvil de 320 px a tablet, y en horizontal: sin desborde, objetivos táctiles de 44 px, sin zoom por doble toque, visor compacto en horizontal y fuentes que no bloquean el pintado

## Próximas fases (pendientes)

- [ ] **App instalable que funcione sin internet (PWA):** `manifest.webmanifest`, iconos y un service worker que guarde las miniaturas y, a pedido, las imágenes grandes.
- [ ] **Principio del día:** una tarjeta destacada en el inicio que cambie cada día.
- [ ] **Modo práctica tipo flashcards:** ver el título y tratar de recordar la definición antes de voltear la tarjeta.
- [ ] **Favoritos y progreso** guardados en el navegador (localStorage).
- [ ] **Interruptor claro/oscuro** (opcional): ofrecer el tema claro original como alternativa al oscuro, que hoy es el único. Los colores ya están centralizados en `:root` y `data.js` sabe calcular variantes para fondos claros.
- [ ] **Versión en texto HTML de cada tarjeta, para SEO:** un script en `tools/` que genere el contenido indexable desde `cards.json`.
- [ ] **Dominio propio:** archivo `CNAME`, y actualizar las URL absolutas de `index.html` y `REPO` en `404.html`.

## Ideas sueltas

- [ ] Pruebas automáticas con Playwright dentro del repo, en `tools/` (en la v1 se probó con un script fuera del repo).
- [ ] Zoom con doble toque dentro del visor para leer la imagen de cerca.
- [ ] Compartir la imagen de la tarjeta, no solo el enlace (Web Share con archivos).
- [ ] Opción de recorrer en el visor solo las tarjetas del filtro o la búsqueda activos.
- [ ] Vista previa propia al compartir cada tarjeta (requiere páginas estáticas por tarjeta).

## Decisiones tomadas en la v1 (donde el encargo era ambiguo)

- **WebP con ffmpeg:** el equipo no tenía sharp ni Pillow, pero sí ffmpeg con libwebp. Usarlo evitó instalar dependencias. `tools/generar-webp.mjs` lo invoca desde Node.
- **Servidor local propio** (`tools/servidor.mjs`, sin dependencias) en lugar de `npx serve`: imita la subruta `/como-ganar-amigos/` y el `404.html` de GitHub Pages, así se detectan antes las rutas mal escritas.
- **Carga diferida con IntersectionObserver** en lugar de `loading="lazy"`: el navegador, con `lazy`, pedía unas 26 miniaturas al cargar; así solo se piden las visibles (6 al inicio).
- **Imagen para compartir compuesta** (1200 × 630) con el mapa al frente: el PNG vertical del mapa se recortaría mal en WhatsApp, Facebook y X.
- **Hogar = Parte 6**, como en la edición original (1936). El chip dice «Hogar».
- **El mapa usa el número «30»** como numeral grande, porque no tiene número de parte.
- **«Sorpréndeme»** elige solo entre principios y reglas, no entre el mapa ni las portadas.
- **El visor recorre las 43 tarjetas en orden**, aunque la galería esté filtrada, y el contador es global («12 / 43»).
- **Búsqueda por inicio de palabra**, combinada con el chip activo: «escuch» encuentra «escuchar», pero «ama» no encuentra «llamada».
- **Panel «Ver texto» del mapa:** lista los 30 principios con enlaces, igual que la imagen. Las portadas listan los principios de su parte.
- **Tema oscuro por defecto** (pedido tras revisar la primera versión): el fondo es un casi-negro cálido derivado de la tinta de las tarjetas, no negro puro, y el papel pasa a ser el color del texto.
- **Colores de sección sobre fondo oscuro:** los originales son oscuros y no sirven como texto (el morado queda en 1,7:1). `data.js` calcula una variante más clara del mismo tono con contraste AA. En rellenos y resplandores se mantiene el color original.
- **Google Fonts sin bloquear el pintado:** en las pruebas, la hoja de fuentes llegó a tardar hasta expirar; con carga asíncrona, la página se ve de inmediato con fuentes de respaldo.
