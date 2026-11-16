// Carga y prepara los datos. data/cards.json es la fuente de verdad: de ahí salen
// títulos, textos alternativos, colores y el orden de las tarjetas.

const DATA_URL = 'data/cards.json';

// Etiqueta corta de cada sección en los chips. Si una sección no aparece aquí
// y tiene número de parte, se muestra «Parte N».
const CHIP_LABELS = { mapa: 'Mapa', hogar: 'Hogar' };

// El sitio usa un tema oscuro. Los colores de sección de cards.json son oscuros
// (pensados para el papel de las tarjetas), así que para texto, números y
// detalles se usa una variante más clara del mismo tono con contraste AA
// (WCAG = 4.5) sobre la superficie oscura más clara donde aparece texto de
// color: la caja «Cómo aplicarlo» (--surface-2 en styles.css). Sobre el fondo
// de la página, más oscuro, el contraste es aún mayor.
const MIN_TEXT_CONTRAST = 4.6;
const TEXT_SURFACE = '#2E2822';

export async function loadData() {
  const response = await fetch(DATA_URL);
  if (!response.ok) throw new Error(`No se pudo cargar ${DATA_URL} (HTTP ${response.status})`);
  return prepare(await response.json());
}

function prepare(raw) {
  // En el tema oscuro, el papel de las tarjetas es el color del texto.
  const paper = raw.palette?.paper ?? '#F4EDE1';

  const sections = raw.sections.map((section) => ({
    ...section,
    chipLabel: CHIP_LABELS[section.id] ?? (section.part ? `Parte ${section.part}` : section.label),
    // Variante del color de la sección con contraste AA para texto sobre el fondo oscuro.
    textColor: readableColor(section.color, TEXT_SURFACE, paper),
    cards: [],
  }));
  const sectionById = new Map(sections.map((s) => [s.id, s]));

  const cards = [...raw.cards]
    .sort((a, b) => a.order - b.order)
    .map((card, index) => ({ ...card, index, sectionInfo: sectionById.get(card.section) }));

  for (const card of cards) {
    if (!card.sectionInfo) throw new Error(`La tarjeta «${card.id}» usa una sección desconocida: ${card.section}`);
    card.sectionInfo.cards.push(card);
  }

  return {
    meta: raw.meta,
    palette: raw.palette,
    sections,
    sectionById,
    cards,
    byId: new Map(cards.map((c) => [c.id, c])),
  };
}

// ---------- Rutas de imagen (relativas: el sitio vive en una subruta) ----------

const webpName = (card) => card.file.replace(/\.png$/i, '.webp');
export const thumbSrc = (card) => `images/thumb/${webpName(card)}`;
export const largeSrc = (card) => `images/large/${webpName(card)}`;
export const originalSrc = (card) => `images/original/${card.file}`;

// ---------- Textos derivados del JSON ----------

const plural = (word, n) => (n === 1 ? word : `${word}s`);

/** Título corto para leyendas: «Sonríe», la etiqueta de la parte en las portadas… */
export function shortTitle(card) {
  if (card.short) return card.short;
  if (card.type === 'portada') return card.sectionInfo.label;
  return card.title;
}

/** «Parte 2 · Cómo agradar a los demás» o «Mapa general». */
export function sectionHeading(section) {
  return section.part ? `Parte ${section.part} · ${section.label}` : section.label;
}

/** Antetítulo del grupo en la galería: «Parte 2 · 6 principios». */
export function groupEyebrow(section) {
  if (!section.part) return section.label;
  const n = section.count ?? section.cards.filter((c) => c.number).length;
  return `Parte ${section.part} · ${n} ${plural(section.unit ?? 'tarjeta', n)}`;
}

/** Número grande del encabezado: el de la parte, o 30 para el mapa. */
export function groupNumeral(section, data) {
  return section.part ?? data.meta?.principles ?? '';
}

/** Antetítulo de una tarjeta: «Parte 2 · Principio 2 de 6», «Parte 6 · Regla 1 de 7»… */
export function cardKicker(card) {
  const section = card.sectionInfo;
  if (card.type === 'mapa') return section.label;
  const part = section.part ? `Parte ${section.part}` : section.label;
  if (card.type === 'portada') return `${part} · Portada`;
  const unit = card.type === 'regla' ? 'Regla' : 'Principio';
  return `${part} · ${unit} ${card.number} de ${section.count}`;
}

// ---------- Color: contraste WCAG ----------

function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

function hexToRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHsl([r, g, b]) {
  [r, g, b] = [r / 255, g / 255, b / 255];
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h / 6, s, l];
}

function hslToHex(h, s, l) {
  const channel = (n) => {
    const k = (n + h * 12) % 12;
    const a = s * Math.min(l, 1 - l);
    const value = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(value * 255).toString(16).padStart(2, '0');
  };
  return `#${channel(0)}${channel(8)}${channel(4)}`;
}

/**
 * Ajusta solo la luminosidad del color (mismo tono y saturación) hasta lograr
 * el contraste mínimo sobre `surface`: lo aclara si el fondo es oscuro y lo
 * oscurece si es claro. Los tonos casi grises (como el del mapa) usan `neutral`.
 */
function readableColor(color, surface, neutral) {
  const [h, s, l] = rgbToHsl(hexToRgb(color));
  if (s < 0.2) return neutral;
  const step = luminance(surface) < 0.18 ? 0.01 : -0.01;
  let result = color;
  for (let light = l; contrast(result, surface) < MIN_TEXT_CONTRAST && light >= 0 && light <= 1; light += step) {
    result = hslToHex(h, s, light);
  }
  return result;
}
