// axe (WCAG 2.2 AA) at phone and desktop widths, plus a horizontal-scroll check at 375.
// Serves dist/ itself and fails on any request that leaves the local origin.
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';

const root = new URL('../dist/', import.meta.url).pathname;
const types = { '.html': 'text/html', '.css': 'text/css', '.woff2': 'font/woff2' };
const server = createServer(async (req, res) => {
  const path = new URL(req.url ?? '/', 'http://localhost').pathname;
  try {
    const file = join(root, path.endsWith('/') ? path + 'index.html' : path);
    res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' }).end(await readFile(file));
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const origin = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch();
let failed = false;
for (const width of [375, 1280]) {
  const context = await browser.newContext({ viewport: { width, height: 900 } });
  const page = await context.newPage();
  const foreign = [];
  page.on('request', (r) => { if (!r.url().startsWith(origin)) foreign.push(r.url()); });
  await page.goto(origin + '/', { waitUntil: 'networkidle' });
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  console.log(`width ${width}: ${violations.length} axe violations, horizontal overflow ${overflow}px, foreign requests ${foreign.length}`);
  for (const v of violations) console.error(` - ${v.id}: ${v.help} (${v.nodes.length} nodes)`);
  if (violations.length || foreign.length) failed = true;
  if (width === 375 && overflow > 0) failed = true;
  await context.close();
}
await browser.close();
server.close();
if (failed) process.exit(1);
