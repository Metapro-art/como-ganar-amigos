// Utilidades de interfaz compartidas: avisos, portapapeles y escape de HTML.

export const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const escapeHTML = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ESCAPES[ch]);

// Capa activa: el visor si está abierto (es modal y deja el resto de la página
// inerte), si no, el documento.
const activeLayer = () => document.querySelector('dialog[open]') ?? document.body;

let toastTimer;

/** Muestra un aviso breve (también lo anuncian los lectores de pantalla). */
export function toast(message) {
  const el = activeLayer().querySelector(':scope > .toast');
  if (!el) return;
  clearTimeout(toastTimer);
  el.textContent = '';
  requestAnimationFrame(() => {
    el.textContent = message;
    el.classList.add('is-visible');
    toastTimer = setTimeout(() => el.classList.remove('is-visible'), 2600);
  });
}

/** Copia texto al portapapeles. Devuelve true si lo logró. */
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Respaldo para navegadores sin la API del portapapeles (o sin HTTPS).
    const previous = document.activeElement;
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;';
    activeLayer().append(area);
    area.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {
      ok = false;
    }
    area.remove();
    previous?.focus?.({ preventScroll: true });
    return ok;
  }
}
