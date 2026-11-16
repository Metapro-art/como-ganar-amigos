// Punto de entrada: carga los datos, pinta la galería y conecta la navegación.
//
// Rutas (hash): «#/p2-2» abre esa tarjeta en el visor. Abrir el visor agrega una
// entrada al historial; moverse entre tarjetas la reemplaza. Así el botón Atrás
// del navegador siempre cierra el visor.

import { loadData } from './data.js';
import { buildIndex, parseQuery, matches } from './search.js';
import { renderChips, renderGallery, renderDeck, setActiveChip, showOnly } from './gallery.js';
import { createViewer } from './viewer.js';
import { toast, reducedMotion } from './ui.js';
import { registerServiceWorker, setupInstallButton } from './install.js';

const $ = (selector) => document.querySelector(selector);

const els = {
  gallery: $('.gallery'),
  galleryWrap: $('#galeria'),
  chips: $('.chips'),
  bar: $('.sectionbar'),
  sentinel: $('.sectionbar-sentinel'),
  form: $('.search'),
  input: $('#buscar'),
  searchToggle: $('.search-toggle'),
  searchClear: $('.search-clear'),
  status: $('.search-status'),
  empty: $('.empty'),
  deck: $('.hero-deck'),
  note: $('[data-note]'),
};

const state = { section: 'all', query: '' };
const wideSearch = window.matchMedia('(min-width: 1080px)');

// App instalable: se activa de inmediato, sin esperar a los datos.
registerServiceWorker();
setupInstallButton($('[data-action="install"]'));

start();

async function start() {
  let data;
  try {
    data = await loadData();
  } catch (error) {
    console.error(error);
    els.gallery.removeAttribute('aria-busy');
    els.gallery.innerHTML =
      '<p class="gallery-loading">No se pudieron cargar las tarjetas. Revisa tu conexión y recarga la página.</p>';
    return;
  }

  const { width, height } = data.meta.image;
  document.documentElement.style.setProperty('--card-ratio', `${width} / ${height}`);
  document.documentElement.style.setProperty('--card-ratio-n', String(width / height));
  if (data.meta.note) els.note.textContent = data.meta.note;

  renderDeck(els.deck, data);
  renderChips(els.chips, data);
  const gallery = renderGallery(els.gallery, data);
  const index = buildIndex(data.cards);

  // ---------- Visor y rutas ----------

  const cleanURL = () => location.pathname + location.search;
  const cardURL = (id) => `${location.origin}${location.pathname}#/${id}`;
  const idFromHash = () => {
    const match = /^#\/([\w-]+)$/.exec(location.hash);
    return match ? match[1] : null;
  };

  const viewer = createViewer($('.viewer'), data, {
    onRequestClose: closeViewer,
    onRequestNavigate: (id) => {
      history.replaceState(history.state, '', `#/${id}`);
      viewer.show(id);
    },
    cardURL,
  });

  let waitingForBack = false;

  function syncWithURL() {
    waitingForBack = false;
    const id = idFromHash();
    if (id && data.byId.has(id)) {
      viewer.show(id);
      return;
    }
    if (id) {
      history.replaceState(null, '', cleanURL());
      toast('No encontramos esa tarjeta');
    }
    viewer.hide();
  }

  function openCard(id) {
    if (viewer.isOpen) {
      history.replaceState(history.state, '', `#/${id}`);
    } else {
      history.pushState({ visor: true }, '', `#/${id}`);
    }
    viewer.show(id);
  }

  function closeViewer() {
    if (waitingForBack || (!viewer.isOpen && !idFromHash())) return;
    if (history.state?.visor) {
      // Volver a la entrada anterior: el evento popstate cierra el visor.
      waitingForBack = true;
      history.back();
    } else {
      // Se entró directo con un enlace a una tarjeta: solo limpiamos la URL.
      history.replaceState(null, '', cleanURL());
      viewer.hide();
    }
  }

  window.addEventListener('popstate', syncWithURL);
  window.addEventListener('hashchange', syncWithURL);

  // Todos los enlaces «#/id» (miniaturas, Empezar, listas del panel de texto…).
  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href^="#/"]');
    if (!link || event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const id = link.getAttribute('href').slice(2);
    if (!data.byId.has(id)) return;
    event.preventDefault();
    openCard(id);
  });

  $('[data-action="random"]').addEventListener('click', () => {
    const pool = data.cards.filter((c) => (c.type === 'principio' || c.type === 'regla') && c.id !== viewer.currentId);
    openCard(pool[Math.floor(Math.random() * pool.length)].id);
  });

  // ---------- Filtros: sección + búsqueda ----------

  let statusTimer;

  function applyFilters() {
    const terms = parseQuery(state.query);
    const visible = new Set(
      data.cards
        .filter((c) => (state.section === 'all' || c.section === state.section) && matches(index.get(c.id), terms))
        .map((c) => c.id),
    );
    showOnly(gallery, visible);
    els.empty.hidden = visible.size > 0;
    els.bar.classList.toggle('has-query', state.query !== '');
    els.searchClear.setAttribute('aria-label', state.query ? 'Borrar búsqueda' : 'Cerrar búsqueda');

    // El resumen se actualiza con una pequeña pausa para no saturar a los lectores de pantalla.
    clearTimeout(statusTimer);
    if (!terms.length) {
      els.status.textContent = '';
      return;
    }
    statusTimer = setTimeout(() => {
      const n = visible.size;
      const where = state.section === 'all' ? '' : ` en ${data.sectionById.get(state.section).chipLabel}`;
      const query = state.query.trim();
      els.status.textContent =
        n === 0 ? `Sin resultados para «${query}»${where}` : `${n} ${n === 1 ? 'tarjeta' : 'tarjetas'} para «${query}»${where}`;
    }, 250);
  }

  // Lleva el inicio de la galería justo debajo de la barra fija, si no está a la vista.
  function revealGallery() {
    const barHeight = els.bar.offsetHeight;
    const top = els.galleryWrap.getBoundingClientRect().top;
    if (top < barHeight - 1 || top > window.innerHeight * 0.6) {
      window.scrollTo({ top: window.scrollY + top - barHeight, behavior: reducedMotion.matches ? 'auto' : 'smooth' });
    }
  }

  els.chips.addEventListener('click', (event) => {
    const chip = event.target.closest('.chip');
    if (!chip) return;
    state.section = chip.dataset.section;
    setActiveChip(els.chips, state.section);
    applyFilters();
    revealGallery();
  });

  // ---------- Búsqueda ----------

  function setQuery(value) {
    els.input.value = value;
    state.query = value;
    applyFilters();
  }

  function setSearchOpen(open) {
    els.bar.classList.toggle('is-searching', open);
    els.searchToggle.setAttribute('aria-expanded', String(open));
    if (open) els.input.focus();
  }

  els.input.addEventListener('input', () => {
    state.query = els.input.value;
    applyFilters();
    if (state.query.trim()) revealGallery();
  });

  els.form.addEventListener('submit', (event) => {
    event.preventDefault();
    els.input.blur(); // en el celular, «Buscar» oculta el teclado
  });

  els.searchToggle.addEventListener('click', () => setSearchOpen(true));

  els.searchClear.addEventListener('click', () => {
    if (els.input.value) {
      setQuery('');
      els.input.focus();
    } else {
      setSearchOpen(false);
      els.searchToggle.focus();
    }
  });

  els.input.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    if (els.input.value) setQuery('');
    else if (!wideSearch.matches) {
      setSearchOpen(false);
      els.searchToggle.focus();
    }
  });

  // En pantallas angostas, si la búsqueda queda vacía y se sale de ella, vuelven los chips.
  els.form.addEventListener('focusout', (event) => {
    if (wideSearch.matches || state.query || els.form.contains(event.relatedTarget)) return;
    setSearchOpen(false);
  });

  // Atajo: «/» enfoca la búsqueda.
  document.addEventListener('keydown', (event) => {
    if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey || viewer.isOpen) return;
    if (event.target.closest('input, textarea, select, [contenteditable="true"]')) return;
    event.preventDefault();
    if (wideSearch.matches) els.input.focus();
    else setSearchOpen(true);
  });

  $('[data-action="reset"]').addEventListener('click', () => {
    state.section = 'all';
    setActiveChip(els.chips, 'all');
    setQuery('');
    if (!wideSearch.matches) setSearchOpen(false);
    revealGallery();
  });

  // ---------- Barra fija: sombra cuando queda pegada arriba ----------

  new IntersectionObserver(([entry]) => {
    els.bar.classList.toggle('is-stuck', !entry.isIntersecting && entry.boundingClientRect.top < 0);
  }).observe(els.sentinel);

  applyFilters();
  syncWithURL();
}
