// Carga y prepara los datos. data/cards.json es la fuente de verdad: de ahí salen
// títulos, textos alternativos, colores y el orden de las tarjetas.

const DATA_URL = 'data/cards.json';

// Etiqueta corta de cada sección en los chips. Si una sección no aparece aquí
// y tiene número de parte, se muestra «Parte N».
const CHIP_LABELS = { mapa: 'Mapa', hogar: 'Hogar' };

// Contraste mínimo para texto pequeño (WCAG AA = 4.5), medido contra el fondo
// claro más oscuro donde aparece texto de color: la caja «Cómo aplicarlo»
// (--paper-2 en styles.css). Sobre el papel normal el contraste es aún mayor.
const MIN_TEXT_CONTRAST = 4.6;
const DARKEST_TEXT_SURFACE = '#EDE4D3';

export async function loadData() {
  const response = await fetch(DATA_URL);
  if (!response.ok) throw new Error(`No se pudo cargar ${DATA_URL} (HTTP ${response.status})`);
  return prepare(await response.json());
}

function prepare(raw) {
  const ink = raw.palette?.ink ?? '#231F19';

  const sections = raw.sections.map((section) => ({
    ...section,
    chipLabel: CHIP_LABELS[section.id] ?? (section.part ? `Parte ${section.part}` : section.label),
    // Variante del color de la sección con contraste AA para texto pequeño.
    textColor: readableColor(section.color, DARKEST_TEXT_SURFACE, ink),
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

function mix(a, b, t) {
  const [ra, ga, ba] = hexToRgb(a);
  const [rb, gb, bb] = hexToRgb(b);
  const ch = (x, y) => Math.round(x + (y - x) * t).toString(16).padStart(2, '0');
  return `#${ch(ra, rb)}${ch(ga, gb)}${ch(ba, bb)}`;
}

/** Oscurece el color hacia la tinta solo lo necesario para alcanzar el contraste mínimo. */
function readableColor(color, background, ink) {
  let result = color;
  for (let t = 0.04; contrast(result, background) < MIN_TEXT_CONTRAST && t <= 1; t += 0.04) {
    result = mix(color, ink, t);
  }
  return result;
}
