// Fails the build if the output breaks the site's privacy and no-JavaScript rules.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('../dist/', import.meta.url).pathname;
const allowedExternal = [
  /^https:\/\/vitalcompass\.app\/?$/,
  /^https:\/\/eu\.vitalcompass\.app\/privacy$/,
  /^https:\/\/docs\.github\.com\/site-policy\/privacy-policies\/github-general-privacy-statement$/,
];
const errors = [];

function walk(dir) {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

for (const file of walk(root).filter((f) => f.endsWith('.html'))) {
  const html = readFileSync(file, 'utf8');
  const rel = file.slice(root.length);
  for (const m of html.matchAll(/<script\b[^>]*>/gi)) {
    if (!/type="application\/ld\+json"/.test(m[0])) errors.push(`${rel}: script tag ${m[0]}`);
  }
  if (/<style[\s>]/i.test(html)) errors.push(`${rel}: <style> element`);
  if (/\sstyle\s*=/i.test(html)) errors.push(`${rel}: style attribute`);
  if (/\son[a-z]+\s*=/i.test(html)) errors.push(`${rel}: inline event handler`);
  if (!html.includes(`<meta http-equiv="Content-Security-Policy" content="default-src 'self'">`)) {
    errors.push(`${rel}: CSP meta missing`);
  }
  for (const m of html.matchAll(/\s(?:src|href|action|srcset|poster)\s*=\s*"([^"]*)"/gi)) {
    const url = m[1];
    if (url.startsWith('mailto:')) {
      if (!['mailto:hello@aidevgarage.com', 'mailto:support@vitalcompass.app'].includes(url)) {
        errors.push(`${rel}: unexpected mailto ${url}`);
      }
    } else if (/^(https?:)?\/\//i.test(url)) {
      const isCanonical = url === 'https://aidevgarage.com/';
      if (!isCanonical && !allowedExternal.some((r) => r.test(url))) errors.push(`${rel}: external URL ${url}`);
    }
  }
}

for (const file of walk(root).filter((f) => f.endsWith('.css'))) {
  const css = readFileSync(file, 'utf8');
  for (const m of css.matchAll(/(?:url\(\s*["']?|@import\s+["'])((?:https?:)?\/\/[^"')\s]+)/gi)) {
    errors.push(`${file.slice(root.length)}: external reference ${m[1]}`);
  }
}

if (errors.length) {
  console.error('dist check FAILED:\n' + errors.map((e) => ' - ' + e).join('\n'));
  process.exit(1);
}
console.log('dist check passed: no scripts besides JSON-LD, no <style>, no style attributes, no external URLs beyond the allowed links.');
