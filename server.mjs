import { createReadStream, promises as fs } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';

const root = resolve(process.env.STATIC_ROOT ?? './browser');
const port = Number(process.env.PORT ?? 8080);

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

async function resolveFile(urlPath) {
  const requested = decodeURIComponent(urlPath.split('?')[0]);
  const candidate = resolve(join(root, normalize(requested)));

  if (candidate !== root && !candidate.startsWith(root + sep)) {
    return null;
  }

  try {
    const stats = await fs.stat(candidate);
    if (stats.isFile()) {
      return candidate;
    }
  } catch {
    // fall through to the SPA entry point
  }

  return join(root, 'index.html');
}

const server = createServer(async (request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }

  const file = await resolveFile(request.url ?? '/');

  if (!file) {
    response.writeHead(403).end();
    return;
  }

  const isEntryPoint = file.endsWith('index.html');

  response.writeHead(200, {
    'Content-Type': MIME_TYPES[extname(file)] ?? 'application/octet-stream',
    'Cache-Control': isEntryPoint ? 'no-cache' : 'public, max-age=31536000, immutable',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
  });

  if (request.method === 'HEAD') {
    response.end();
    return;
  }

  createReadStream(file).on('error', () => response.destroy()).pipe(response);
});

server.listen(port, '0.0.0.0', () => console.log(`Serving ${root} on http://0.0.0.0:${port}`));

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
