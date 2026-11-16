// Búsqueda en vivo: sin distinguir mayúsculas, tildes ni signos de puntuación.

/** «¡Sí, SÍ!» → «si si» */
export function normalize(text) {
  return String(text)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

/** Texto en el que se busca para cada tarjeta: título, definición y acciones. */
export function buildIndex(cards) {
  return new Map(
    cards.map((card) => {
      const fields = [card.title, card.short, card.subtitle, card.definition, card.summary, ...(card.howTo ?? [])];
      // El espacio inicial permite buscar «inicio de palabra» con includes(' ' + término).
      return [card.id, ` ${normalize(fields.filter(Boolean).join(' '))}`];
    }),
  );
}

/** Convierte lo escrito en una lista de términos. */
export function parseQuery(query) {
  const normalized = normalize(query);
  return normalized ? normalized.split(' ') : [];
}

/**
 * Una tarjeta coincide si contiene todos los términos (en cualquier orden) y
 * cada uno coincide con el inicio de una palabra: «escuch» encuentra
 * «escuchar», pero «ama» no encuentra «llamada».
 */
export function matches(haystack, terms) {
  return terms.every((term) => haystack.includes(` ${term}`));
}
