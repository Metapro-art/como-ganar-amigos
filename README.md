# Cómo ganar amigos — tarjetas de referencia rápida

Los 30 principios y las 7 reglas de *Cómo ganar amigos e influir sobre las personas*, de Dale Carnegie, en 43 tarjetas: galería por secciones, búsqueda en vivo y visor a pantalla completa pensado sobre todo para el celular.

**Sitio:** <https://metapro-art.github.io/como-ganar-amigos/>

## Correrlo localmente

Es un sitio estático, sin paso de build ni dependencias. Con Node.js instalado, desde la raíz del proyecto:

```bash
node tools/servidor.mjs
```

y abre <http://localhost:8080/como-ganar-amigos/>. El servidor imita GitHub Pages: usa la misma subruta y responde con `404.html`. Para probarlo desde el celular en la misma red Wi‑Fi, usa `node tools/servidor.mjs --red`.

También sirve cualquier servidor estático, por ejemplo `npx serve .` o `python -m http.server 8000`. En ese caso el sitio queda en la raíz.

Los detalles para mantenerlo y extenderlo están en [`CLAUDE.md`](CLAUDE.md). Las próximas fases están en [`ROADMAP.md`](ROADMAP.md).

## Nota

Este sitio es un **resumen personal de estudio**. No tiene afiliación con el autor, sus herederos, la editorial ni los titulares de los derechos del libro. Los textos de las tarjetas son una síntesis propia de cada capítulo, no citas textuales.
