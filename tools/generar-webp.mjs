#!/usr/bin/env node
// Genera las versiones WebP de las tarjetas a partir de los PNG originales.
//
// Uso (desde la raíz del proyecto):
//   node tools/generar-webp.mjs           → crea solo las que faltan o cuyo PNG cambió
//   node tools/generar-webp.mjs --todas   → regenera todas
//
// Requisito: ffmpeg con soporte libwebp en el PATH
//   (Windows: `winget install Gyan.FFmpeg`). También puedes indicar la ruta
//   con la variable de entorno FFMPEG.
//
// Lee data/cards.json (la fuente de verdad) y, por cada tarjeta, toma
// images/original/<archivo>.png y crea:
//   images/large/<archivo>.webp  → 1080 px de ancho, calidad 85 (visor)
//   images/thumb/<archivo>.webp  → 400 px de ancho, calidad 80 (galería)

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const VARIANTS = [
  { dir: 'images/large', width: 1080, quality: 85 },
  { dir: 'images/thumb', width: 400, quality: 80 },
];
const forceAll = process.argv.includes('--todas');

const rel = (p) => path.relative(ROOT, p).split(path.sep).join('/');
const kb = (p) => Math.round(fs.statSync(p).size / 1024);
const fail = (msg) => {
  console.error(`\n✗ ${msg}`);
  process.exit(1);
};

// 1. ¿Hay ffmpeg con libwebp?
const probe = spawnSync(FFMPEG, ['-hide_banner', '-encoders'], { encoding: 'utf8' });
if (probe.error || !/libwebp/.test(probe.stdout ?? '')) {
  fail('No encontré ffmpeg con soporte WebP. Instálalo (winget install Gyan.FFmpeg) o define la variable FFMPEG.');
}

// 2. Leer y validar data/cards.json
const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/cards.json'), 'utf8'));
const problems = [];
const ids = new Set();
for (const card of data.cards) {
  if (ids.has(card.id)) problems.push(`id repetido en cards.json: "${card.id}"`);
  ids.add(card.id);
  if (!/\.png$/i.test(card.file)) problems.push(`"${card.id}": el archivo debe ser .png (${card.file})`);
  else if (!fs.existsSync(path.join(ROOT, 'images/original', card.file))) {
    problems.push(`"${card.id}": falta images/original/${card.file}`);
  }
}
if (problems.length) fail(`Revisa estos problemas antes de continuar:\n  - ${problems.join('\n  - ')}`);

// 3. Generar las variantes que falten o estén desactualizadas
const isUpToDate = (src, dest) =>
  fs.existsSync(dest) && fs.statSync(dest).mtimeMs >= fs.statSync(src).mtimeMs;

let created = 0;
let skipped = 0;
for (const card of data.cards) {
  const src = path.join(ROOT, 'images/original', card.file);
  const name = card.file.replace(/\.png$/i, '.webp');
  for (const v of VARIANTS) {
    const dest = path.join(ROOT, v.dir, name);
    if (!forceAll && isUpToDate(src, dest)) {
      skipped++;
      continue;
    }
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    const result = spawnSync(
      FFMPEG,
      [
        '-v', 'error', '-y',
        '-i', src,
        '-vf', `scale=${v.width}:-1:flags=lanczos+accurate_rnd`,
        '-c:v', 'libwebp',
        '-quality', String(v.quality),
        '-compression_level', '6',
        dest,
      ],
      { encoding: 'utf8' },
    );
    if (result.status !== 0) fail(`ffmpeg falló con ${card.file}:\n${result.stderr}`);
    created++;
    console.log(`✓ ${rel(dest)}  (${kb(dest)} KB)`);
  }
}

// 4. Avisar de archivos que no corresponden a ninguna tarjeta
const expected = new Set(data.cards.map((c) => c.file.replace(/\.png$/i, '.webp')));
const expectedPng = new Set(data.cards.map((c) => c.file));
for (const v of VARIANTS) {
  for (const f of fs.readdirSync(path.join(ROOT, v.dir))) {
    if (!expected.has(f)) console.warn(`Aviso: ${v.dir}/${f} no corresponde a ninguna tarjeta de cards.json`);
  }
}
for (const f of fs.readdirSync(path.join(ROOT, 'images/original'))) {
  if (!expectedPng.has(f)) console.warn(`Aviso: images/original/${f} no aparece en cards.json`);
}

console.log(`\nListo: ${created} imágenes creadas, ${skipped} ya estaban al día (${data.cards.length} tarjetas).`);
