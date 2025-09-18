PWA offline + Trigram search

What was added

- public/manifest.webmanifest
- public/offline.html
- public/sw.js (service worker)
- public/sw-register.js (drop-in registrar)
- public/js/trigramSearch.js (browser ESM)
- src/trigramSearch.ts (TypeScript version)
- vercel.json (headers for SW + manifest)

How to integrate

Add to <head> (site-wide):

<link rel="manifest" href="/manifest.webmanifest">
<meta name="theme-color" content="#0f172a">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<link rel="apple-touch-icon" href="/icons/apple-touch-icon-180.png" sizes="180x180">

Register the Service Worker (before </body>):

<script src="/sw-register.js" defer></script>

Next.js (App Router)

- In app/layout.tsx add the <link rel="manifest" ...> and meta tags in <head>.
- Include <script src="/sw-register.js" defer></script> via next/script or a custom component if preferred.

Next.js (Pages Router)

- In pages/_document.tsx add the head tags above.
- In pages/_app.tsx include sw-register.js with next/script.

Vite / plain HTML

- Add the head tags to index.html and include /sw-register.js before </body>.

iOS install notes

- Visit the site once online to let the SW cache content.
- Add to Home Screen; then open from Home Screen for full-screen PWA.
- For updates, fully close the app and reopen; headers in vercel.json ensure quick SW updates.

Using the trigram search

Browser ESM:

<script type="module">
  import { TrigramSearchIndex } from '/js/trigramSearch.js';
  const data = [ { id: '1', title: 'Example', body: 'Hello world' } ];
  const idx = new TrigramSearchIndex();
  idx.addAll(d => `${d.title} ${d.body}`, data);
  console.log(idx.search('exam'));
</script>

TypeScript:

import { TrigramSearchIndex } from './src/trigramSearch';

Icons

- Put icon-192.png, icon-512.png, and apple-touch-icon-180.png under public/icons/.
- Use solid background for iOS icons (no transparent corners).

