// Galería: chips de sección, grupos con miniaturas y el abanico de portadas del inicio.

import { thumbSrc, shortTitle, groupEyebrow, groupNumeral } from './data.js';
import { escapeHTML as esc, reducedMotion } from './ui.js';

const THUMB_WIDTH = 400;

/** Variables CSS con los colores de una sección (--c: decorativo, --c-text: texto). */
export const sectionStyle = (section) => `--c:${section.color};--c-text:${section.textColor}`;

/** Alto de las miniaturas según la proporción declarada en cards.json. */
function thumbHeight(data) {
  const { width = 1440, height = 2560 } = data.meta?.image ?? {};
  return Math.round((THUMB_WIDTH * height) / width);
}

// ---------- Chips de sección ----------

export function renderChips(container, data) {
  const all = `<button class="chip" type="button" data-section="all" aria-pressed="true">Todas</button>`;
  const chips = data.sections.map(
    (s) => `
      <button class="chip" type="button" data-section="${s.id}" aria-pressed="false" style="${sectionStyle(s)}">
        <span class="chip-dot" aria-hidden="true"></span>${esc(s.chipLabel)}
      </button>`,
  );
  container.innerHTML = all + chips.join('');
}

export function setActiveChip(container, sectionId) {
  for (const chip of container.querySelectorAll('.chip')) {
    const active = chip.dataset.section === sectionId;
    chip.setAttribute('aria-pressed', String(active));
    if (active) {
      // Centra el chip activo dentro de la fila (solo desplazamiento horizontal).
      const box = container.getBoundingClientRect();
      const rect = chip.getBoundingClientRect();
      container.scrollBy({
        left: rect.left - box.left - (box.width - rect.width) / 2,
        behavior: reducedMotion.matches ? 'auto' : 'smooth',
      });
    }
  }
}

// ---------- Galería ----------

export function renderGallery(container, data) {
  const h = thumbHeight(data);
  container.innerHTML = data.sections
    .map((section) => {
      const single = section.cards.length === 1;
      return `
      <section class="group${single ? ' group--single' : ''}" data-section="${section.id}"
               style="${sectionStyle(section)}" aria-labelledby="grupo-${section.id}">
        <header class="group-head">
          <span class="group-num" aria-hidden="true">${esc(groupNumeral(section, data))}</span>
          <div class="group-text">
            <p class="eyebrow">${esc(groupEyebrow(section))}</p>
            <h2 class="group-title" id="grupo-${section.id}">${esc(section.name)}</h2>
            ${section.summary ? `<p class="group-summary">${esc(section.summary)}</p>` : ''}
            ${section.note ? `<p class="group-note">${esc(section.note)}</p>` : ''}
          </div>
        </header>
        <ol class="grid">${section.cards.map((card) => tileHTML(card, h)).join('')}</ol>
      </section>`;
    })
    .join('');
  container.removeAttribute('aria-busy');
  lazyLoad(container.querySelectorAll('img[data-src]'));

  return {
    tiles: new Map([...container.querySelectorAll('.tile')].map((el) => [el.dataset.id, el])),
    groups: [...container.querySelectorAll('.group')],
  };
}

function tileHTML(card, h) {
  const numbered = typeof card.number === 'number';
  const caption = numbered
    ? `<span class="tile-num">${card.number}</span>`
    : `<span class="tile-kicker">${card.type === 'mapa' ? 'Mapa' : 'Portada'}</span>`;
  return `
    <li class="tile" data-id="${card.id}">
      <a class="tile-link" href="#/${card.id}">
        <span class="tile-media">
          <img data-src="${thumbSrc(card)}" alt="${esc(card.alt)}" width="${THUMB_WIDTH}" height="${h}" decoding="async">
        </span>
        <span class="tile-cap${numbered ? '' : ' tile-cap--stack'}" aria-hidden="true">
          ${caption}<span class="tile-title">${esc(shortTitle(card))}</span>
        </span>
      </a>
    </li>`;
}

// Carga diferida: cada miniatura se pide solo cuando está a punto de verse
// (incluye un margen para que al hacer scroll ya esté lista). Las tarjetas
// ocultas por un filtro no se cargan hasta que vuelvan a mostrarse.
const LAZY_MARGIN = '300px 0px';

function lazyLoad(images) {
  const load = (img) => {
    img.addEventListener('load', () => img.classList.add('is-loaded'), { once: true });
    img.src = img.dataset.src;
    img.removeAttribute('data-src');
  };
  if (!('IntersectionObserver' in window)) {
    images.forEach(load);
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer.unobserve(entry.target);
        load(entry.target);
      }
    },
    { rootMargin: LAZY_MARGIN },
  );
  images.forEach((img) => observer.observe(img));
}

/** Deja visibles solo las tarjetas de `visibleIds` (y oculta los grupos vacíos). */
export function showOnly({ tiles, groups }, visibleIds) {
  for (const [id, tile] of tiles) tile.hidden = !visibleIds.has(id);
  for (const group of groups) group.hidden = !group.querySelector('.tile:not([hidden])');
}

// ---------- Abanico de portadas del inicio (decorativo) ----------

export function renderDeck(container, data) {
  const covers = data.cards.filter((c) => c.type === 'portada');
  const middle = (covers.length - 1) / 2;
  const h = thumbHeight(data);
  container.innerHTML = covers
    .map(
      (card, i) => `
      <a class="deck-card" href="#/${card.id}" tabindex="-1" style="--i:${i - middle}">
        <img src="${thumbSrc(card)}" alt="" width="${THUMB_WIDTH}" height="${h}" decoding="async" draggable="false">
      </a>`,
    )
    .join('');
}
