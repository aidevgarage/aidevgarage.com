# aidevgarage.com

The company site of AI Dev Garage, served at https://aidevgarage.com.

A static [Astro](https://astro.build) build with no client-side JavaScript, no cookies and no third-party requests. Fonts are self-hosted (Golos Text, in `public/fonts/`), and a `Content-Security-Policy` meta tag restricts the page to its own origin.

```sh
npm ci
npm run dev          # local preview
npm run build        # static output in dist/
npm run check:dist   # no scripts besides JSON-LD, no inline styles, no third-party URLs
npm run check:links  # internal links and anchors in dist/
npm run check:a11y   # axe WCAG 2.2 AA at 375 and 1280 px (needs: npx playwright install chromium)
npm run lhci         # Lighthouse CI against dist/
```

## CI and deploy

`.github/workflows/ci.yml` runs on pull requests and on pushes to `main`: type check, build, the dist and link checks, axe, and Lighthouse CI (performance and best practices at least 0.95, accessibility and SEO 1, LCP under 2.5 s, CLS under 0.1, TBT under 200 ms).

`.github/workflows/deploy.yml` publishes `dist/` to GitHub Pages on every push to `main`. The custom domain comes from `public/CNAME`.
