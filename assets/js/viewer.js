// Visor a pantalla completa (<dialog> modal).
//
// El visor no toca la URL: pide abrir, cerrar o cambiar de tarjeta mediante
// los callbacks, y app.js decide cómo reflejarlo en el historial.

import { largeSrc, thumbSrc, originalSrc, sectionHeading, cardKicker, shortTitle } from './data.js';
import { sectionStyle } from './gallery.js';
import { escapeHTML as esc, toast, copyText, reducedMotion } from './ui.js';

const SWIPE_DISTANCE = 60; // px mínimos para pasar de tarjeta
const SWIPE_VELOCITY = 0.45; // px/ms: un gesto corto pero rápido también cuenta
const CLOSE_DURATION = 180; // ms (debe coincidir con la animación .is-closing)

export function createViewer(dialog, data, { onRequestClose, onRequestNavigate, cardURL }) {
  const $ = (selector) => dialog.querySelector(selector);
  const els = {
    sectionLabel: $('.viewer-section-label'),
    counter: $('.viewer-counter'),
    title: $('#visor-titulo'),
    close: $('.viewer-close'),
    stage: $('.viewer-stage'),
    frame: $('.viewer-frame'),
    placeholder: $('.viewer-placeholder'),
    img: $('.viewer-img'),
    text: $('.viewer-text'),
    prev: $('[data-action="prev"]'),
    next: $('[data-action="next"]'),
    textToggle: $('[data-action="text"]'),
    download: $('[data-action="download"]'),
    share: $('[data-action="share"]'),
    live: $('[data-live]'),
  };

  const total = data.cards.length;
  const pageTitle = document.title;
  const preloaded = new Set();
  let current = null; // tarjeta visible
  let firstCard = null; // tarjeta con la que se abrió
  let opener = null; // elemento que tenía el foco antes de abrir
  let closing = false;
  let closedByUs = false;

  // ---------- Abrir y cerrar ----------

  function show(id) {
    const card = data.byId.get(id);
    if (!card) return;
    if (!dialog.open || closing) open(card);
    else if (card !== current) render(card, card.index > current.index ? 'next' : 'prev');
  }

  function open(card) {
    if (closing) finishClose(); // si se reabre durante la animación de cierre
    opener = document.activeElement;
    firstCard = card;
    document.documentElement.classList.add('has-viewer');
    dialog.showModal();
    render(card, 'enter');
    // El foco va al visor (los lectores de pantalla anuncian el título de la
    // tarjeta) y no a un botón: así no aparece un anillo de foco al abrir
    // un enlace compartido. El primer Tab lleva al botón de cerrar.
    dialog.focus();
  }

  function hide() {
    if (!dialog.open || closing) return;
    if (reducedMotion.matches) {
      finishClose();
      return;
    }
    closing = true;
    dialog.classList.add('is-closing');
    setTimeout(() => closing && finishClose(), CLOSE_DURATION);
  }

  function finishClose() {
    closing = false;
    dialog.classList.remove('is-closing');
    if (dialog.open) {
      closedByUs = true;
      dialog.close();
    }
    cleanup();
  }

  function cleanup() {
    const lastCard = current;
    current = null;
    document.documentElement.classList.remove('has-viewer');
    setTextOpen(false);
    document.title = pageTitle;
    restoreFocus(lastCard);
  }

  // Al cerrar, el foco vuelve a la miniatura de la última tarjeta vista (si
  // cambió) o al elemento que abrió el visor.
  function restoreFocus(lastCard) {
    const link = lastCard && document.querySelector(`.tile:not([hidden]) > .tile-link[href="#/${lastCard.id}"]`);
    if (link && lastCard !== firstCard) {
      link.focus({ preventScroll: true });
      link.scrollIntoView({ block: 'center', behavior: 'instant' });
    } else if (opener?.isConnected && opener !== document.body) {
      opener.focus({ preventScroll: true });
    }
  }

  // ---------- Mostrar una tarjeta ----------

  function render(card, animation) {
    current = card;
    const section = card.sectionInfo;

    dialog.setAttribute('style', sectionStyle(section));
    els.sectionLabel.textContent = sectionHeading(section);
    els.counter.innerHTML =
      `<span class="visually-hidden">Tarjeta </span>${card.index + 1}` +
      `<span aria-hidden="true"> / </span><span class="visually-hidden"> de </span>${total}`;
    els.title.textContent = card.title;
    document.title = `${shortTitle(card)} · Cómo ganar amigos`;

    // La miniatura (normalmente ya en caché) se ve mientras carga la imagen grande.
    els.frame.classList.remove('is-loaded');
    els.placeholder.src = thumbSrc(card);
    els.img.alt = card.alt;
    els.img.src = largeSrc(card);
    if (els.img.complete && els.img.naturalWidth) els.frame.classList.add('is-loaded');

    els.download.href = originalSrc(card);
    els.download.setAttribute('download', card.file);
    els.prev.disabled = card.index === 0;
    els.next.disabled = card.index === total - 1;

    if (!els.text.hidden) renderText(card);
    if (animation !== 'enter') els.live.textContent = `Tarjeta ${card.index + 1} de ${total}: ${shortTitle(card)}`;

    animate(animation);
    preloadNeighbours(card);
  }

  els.img.addEventListener('load', () => els.frame.classList.add('is-loaded'));

  function animate(kind) {
    const frame = els.frame;
    frame.classList.remove('is-entering', 'slide-next', 'slide-prev');
    if (!kind || reducedMotion.matches) return;
    void frame.offsetWidth; // reinicia la animación si se repite la misma clase
    frame.classList.add(kind === 'enter' ? 'is-entering' : `slide-${kind}`);
  }

  els.frame.addEventListener('animationend', () => {
    els.frame.classList.remove('is-entering', 'slide-next', 'slide-prev');
  });

  function preloadNeighbours(card) {
    for (const neighbour of [data.cards[card.index - 1], data.cards[card.index + 1]]) {
      if (!neighbour || preloaded.has(neighbour.id)) continue;
      preloaded.add(neighbour.id);
      const img = new Image();
      img.decoding = 'async';
      img.src = largeSrc(neighbour);
    }
  }

  function go(step) {
    const target = current && data.cards[current.index + step];
    if (target) onRequestNavigate(target.id);
  }

  // ---------- Panel «Ver texto» ----------

  function setTextOpen(open) {
    els.text.hidden = !open;
    dialog.classList.toggle('is-text-open', open);
    els.textToggle.setAttribute('aria-expanded', String(open));
    if (open && current) renderText(current);
  }

  function renderText(card) {
    els.text.innerHTML = textHTML(card);
    els.text.scrollTop = 0;
  }

  // Partes cuyo listado aparece en el mapa (las que agrupan principios).
  const mapSections = () => data.sections.filter((s) => s.unit === 'principio');
  const numbered = (section) => section.cards.filter((c) => typeof c.number === 'number');

  function textHTML(card) {
    const title = card.type === 'portada' ? card.sectionInfo.name : card.title;
    let html = `
      <p class="eyebrow">${esc(cardKicker(card))}</p>
      <h3 class="vt-title">${esc(title)}</h3>
      ${card.subtitle ? `<p class="vt-subtitle">${esc(card.subtitle)}</p>` : ''}`;

    if (card.definition) {
      html += `<h4 class="vt-label">Qué significa</h4><p class="vt-definition">${esc(card.definition)}</p>`;
    }
    if (card.howTo?.length) {
      html += `
        <div class="vt-howto">
          <h4 class="vt-label">Cómo aplicarlo</h4>
          <ul>${card.howTo.map((item) => `<li>${esc(item)}</li>`).join('')}</ul>
        </div>`;
    }
    if (card.summary) html += `<p class="vt-summary">${esc(card.summary)}</p>`;
    if (card.type === 'portada') html += listHTML(numbered(card.sectionInfo));
    if (card.type === 'mapa') {
      html += mapSections()
        .map(
          (s) => `
          <div class="vt-part" style="${sectionStyle(s)}">
            <h4 class="vt-label">${esc(sectionHeading(s))}</h4>
            ${listHTML(numbered(s))}
          </div>`,
        )
        .join('');
    }

    return `
      <div class="vt-inner">
        ${html}
        <button class="btn btn-small vt-copy" type="button" data-action="copy">
          <svg class="icon" aria-hidden="true"><use href="#i-copy"/></svg> Copiar texto
        </button>
      </div>`;
  }

  const listHTML = (cards) => `
    <ol class="vt-list">
      ${cards
        .map((c) => `<li><a href="#/${c.id}"><span class="vt-num">${c.number}</span><span>${esc(shortTitle(c))}</span></a></li>`)
        .join('')}
    </ol>`;

  function plainText(card) {
    const lines = [card.title];
    if (card.subtitle) lines.push(card.subtitle);
    if (card.definition) lines.push('', card.definition);
    if (card.howTo?.length) lines.push('', 'Cómo aplicarlo:', ...card.howTo.map((item) => `• ${item}`));
    if (card.summary) lines.push('', card.summary);
    const lists = card.type === 'mapa' ? mapSections() : card.type === 'portada' ? [card.sectionInfo] : [];
    for (const section of lists) {
      lines.push('');
      if (card.type === 'mapa') lines.push(sectionHeading(section));
      lines.push(...numbered(section).map((c) => `${c.number}. ${shortTitle(c)}`));
    }
    lines.push('', `— ${data.meta.book}, ${data.meta.author}`, cardURL(card.id));
    return lines.join('\n');
  }

  // ---------- Compartir ----------

  async function share() {
    const card = current;
    if (!card) return;
    const url = cardURL(card.id);
    const title = shortTitle(card);
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${title} · ${data.meta.book}`,
          text: `«${title}» — ${data.meta.book}, de ${data.meta.author}.`,
          url,
        });
        return;
      } catch (error) {
        if (error.name === 'AbortError') return; // la persona canceló
      }
    }
    toast((await copyText(url)) ? 'Enlace copiado al portapapeles' : 'No se pudo copiar el enlace');
  }

  // ---------- Eventos ----------

  els.close.addEventListener('click', () => onRequestClose());
  els.prev.addEventListener('click', () => go(-1));
  els.next.addEventListener('click', () => go(1));
  els.textToggle.addEventListener('click', () => setTextOpen(els.text.hidden));
  els.share.addEventListener('click', share);
  els.text.addEventListener('click', async (event) => {
    if (!event.target.closest('[data-action="copy"]') || !current) return;
    toast((await copyText(plainText(current))) ? 'Texto copiado' : 'No se pudo copiar el texto');
  });

  dialog.addEventListener('keydown', (event) => {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      go(-1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      go(1);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      onRequestClose();
    } else if (event.key === 'Tab') {
      trapFocus(event);
    }
  });

  // Esc, el gesto «atrás» de Android, etc. llegan como «cancel».
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    onRequestClose();
  });

  // Si el navegador cerró el diálogo por su cuenta, sincronizamos el estado.
  dialog.addEventListener('close', () => {
    if (closedByUs) {
      closedByUs = false;
      return;
    }
    closing = false;
    dialog.classList.remove('is-closing');
    cleanup();
    onRequestClose();
  });

  // El foco no sale del visor: Tab y Mayús+Tab dan la vuelta.
  function trapFocus(event) {
    const focusables = [...dialog.querySelectorAll('button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])')].filter(
      (el) => el.getClientRects().length > 0,
    );
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (document.activeElement === dialog) {
      event.preventDefault();
      (event.shiftKey ? last : first).focus();
    } else if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  // ---------- Deslizar (swipe) con el dedo o arrastrando con el ratón ----------

  const isZoomed = () => (window.visualViewport?.scale ?? 1) > 1.01;
  window.visualViewport?.addEventListener('resize', () => dialog.classList.toggle('is-zoomed', isZoomed()));

  let drag = null;

  els.stage.addEventListener('pointerdown', (event) => {
    if (!current || (event.pointerType === 'mouse' && event.button !== 0) || isZoomed()) return;
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, t: event.timeStamp, active: false };
  });

  els.stage.addEventListener('pointermove', (event) => {
    if (!drag || event.pointerId !== drag.id) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (!drag.active) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      if (Math.abs(dx) <= Math.abs(dy)) {
        drag = null; // gesto vertical: no es un swipe
        return;
      }
      drag.active = true;
      els.stage.setPointerCapture(event.pointerId);
      animate(null);
      els.frame.classList.add('is-dragging');
    }
    // En los extremos la tarjeta se resiste un poco.
    const blocked = (dx > 0 && current.index === 0) || (dx < 0 && current.index === total - 1);
    if (!reducedMotion.matches) els.frame.style.transform = `translateX(${blocked ? dx * 0.25 : dx}px)`;
  });

  function endDrag(event) {
    if (!drag || event.pointerId !== drag.id) return;
    const { active, x, t } = drag;
    drag = null;
    els.frame.classList.remove('is-dragging');
    els.frame.style.transform = '';
    if (!active || event.type === 'pointercancel') return;
    const dx = event.clientX - x;
    const velocity = Math.abs(dx) / Math.max(1, event.timeStamp - t);
    if (Math.abs(dx) >= SWIPE_DISTANCE || (velocity >= SWIPE_VELOCITY && Math.abs(dx) >= 20)) go(dx < 0 ? 1 : -1);
  }

  els.stage.addEventListener('pointerup', endDrag);
  els.stage.addEventListener('pointercancel', endDrag);

  return {
    show,
    hide,
    get isOpen() {
      return dialog.open && !closing;
    },
    get currentId() {
      return current?.id ?? null;
    },
  };
}
