#!/usr/bin/env node
// Servidor local mínimo que imita GitHub Pages (sin dependencias).
//
// Sirve el sitio en la misma subruta que tendrá publicado, para detectar
// rutas absolutas por error, y responde con 404.html lo que no exista.
//
// Uso (desde la raíz del proyecto):
//   node tools/servidor.mjs           → http://localhost:8080/como-ganar-amigos/
//   node tools/servidor.mjs 3000      → otro puerto
//   node tools/servidor.mjs --red     → también accesible desde el celular en la misma red Wi-Fi

import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = '/como-ganar-amigos/';
const args = process.argv.slice(2);
const PORT = Number(args.find((a) => /^\d+$/.test(a))) || 8080;
const HOST = args.includes('--red') ? '0.0.0.0' : '127.0.0.1';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
};

function send404(res) {
  res.writeHead(404, { 'Content-Type': TYPES['.html'], 'Cache-Control': 'no-store' });
  fs.createReadStream(path.join(ROOT, '404.html')).pipe(res);
}

const server = http.createServer((req, res) => {
  const { pathname } = new URL(req.url, 'http://localhost');

  if (pathname === '/' || pathname === BASE.slice(0, -1)) {
    res.writeHead(302, { Location: BASE });
    res.end();
    return;
  }
  if (!pathname.startsWith(BASE)) return send404(res);

  let relative;
  try {
    relative = decodeURIComponent(pathname.slice(BASE.length));
  } catch {
    return send404(res);
  }
  if (relative === '' || relative.endsWith('/')) relative += 'index.html';

  // Nada fuera del proyecto ni archivos ocultos (.git, .gitignore…).
  const file = path.resolve(ROOT, relative);
  if (!file.startsWith(ROOT + path.sep) || relative.split('/').some((part) => part.startsWith('.'))) {
    return send404(res);
  }

  fs.stat(file, (error, stats) => {
    if (error || !stats.isFile()) return send404(res);
    res.writeHead(200, {
      'Content-Type': TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream',
      'Content-Length': stats.size,
      'Cache-Control': 'no-cache',
    });
    if (req.method === 'HEAD') res.end();
    else fs.createReadStream(file).pipe(res);
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Sitio local: http://localhost:${PORT}${BASE}`);
  if (HOST === '0.0.0.0') {
    for (const nets of Object.values(os.networkInterfaces())) {
      for (const net of nets ?? []) {
        if (net.family === 'IPv4' && !net.internal) console.log(`En tu red:   http://${net.address}:${PORT}${BASE}`);
      }
    }
  }
  console.log('Ctrl+C para detener.');
});
