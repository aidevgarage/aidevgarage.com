// Checks internal links and anchors of dist/ only; external links are skipped.
import { LinkChecker } from 'linkinator';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';

const root = new URL('../dist/', import.meta.url).pathname;
const types = { '.html': 'text/html', '.css': 'text/css', '.woff2': 'font/woff2', '.xml': 'application/xml', '.txt': 'text/plain' };
const server = createServer(async (req, res) => {
  const path = new URL(req.url ?? '/', 'http://localhost').pathname;
  try {
    const file = join(root, path.endsWith('/') ? path + 'index.html' : path);
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' }).end(body);
  } catch {
    res.writeHead(404).end('not found');
  }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}/`;

const result = await new LinkChecker().check({
  path: base,
  checkFragments: true,
  linksToSkip: ['^(?!http://127\\.0\\.0\\.1).*'],
});
server.close();
const broken = result.links.filter((l) => l.state === 'BROKEN');
const checked = result.links.filter((l) => l.state === 'OK').length;
console.log(`link check: ${checked} internal links OK, ${broken.length} broken, ${result.links.filter((l) => l.state === 'SKIPPED').length} external skipped`);
if (broken.length) {
  for (const b of broken) console.error(` - ${b.url} (${b.status}) ${JSON.stringify(b.failureDetails ?? '')}`);
  process.exit(1);
}
