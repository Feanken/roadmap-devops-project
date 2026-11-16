// Tiny static file server for local development (no Python/Docker needed).
//
//   node tools/serve.mjs            # http://127.0.0.1:8080
//   PORT=3000 node tools/serve.mjs
//
// Serves only the app files, with correct MIME types and no caching, so edits
// show up on reload. It is NOT meant for production (use the Docker image).

import { createServer } from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { dirname, extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.PORT ?? 8080);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

// Never expose repo internals even though they sit next to the app files.
const PRIVATE = ['tests', 'tools', 'nginx', 'node_modules', '.git'];

const server = createServer((req, res) => {
  const { pathname } = new URL(req.url, 'http://localhost');
  const relative = normalize(decodeURIComponent(pathname)).replace(/^([/\\])+/, '') || 'index.html';
  const file = resolve(root, relative);
  const top = relative.split(sep)[0];

  const insideRoot = file === root || file.startsWith(root + sep);
  const hidden = PRIVATE.includes(top) || top.startsWith('.') || ['package.json', 'Dockerfile'].includes(relative);

  let target = file;
  try {
    if (insideRoot && !hidden && statSync(file).isDirectory()) target = join(file, 'index.html');
    if (!insideRoot || hidden || !statSync(target).isFile()) throw new Error('not found');
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found');
    return;
  }

  res.writeHead(200, {
    'Content-Type': MIME[extname(target)] ?? 'application/octet-stream',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  createReadStream(target).pipe(res);
});

server.listen(port, '127.0.0.1', () => console.log(`Lofi Pomodoro on http://127.0.0.1:${port}`));
