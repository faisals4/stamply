#!/usr/bin/env node
/**
 * Post-process the index.html that Expo Router emits in `single`
 * output mode. Two things need to happen on every build:
 *
 *   1. Default <html lang/dir> to Arabic + RTL so the very first
 *      paint matches what the customer expects, instead of flashing
 *      LTR until i18next swaps it at runtime.
 *
 *   2. Inject `<link rel="preload" as="font">` tags for all four
 *      IBM Plex Sans Arabic WOFF2 weights so the browser kicks off
 *      the font fetch in parallel with the CSS download. Without
 *      preload, the browser only discovers the @font-face URLs
 *      while parsing CSS, adding ~100-200ms of system-font flash
 *      before the real font swaps in.
 *
 * This script is run automatically after `expo export` via the
 * `build:web` npm script. Idempotent — running it twice on the
 * same file is a no-op for the preloads (regex match prevents
 * duplicate injection) and a no-op for the lang/dir attributes
 * (already-replaced values match the new pattern).
 */
const fs = require('fs');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '../../api/public/app/index.html');

const FONT_PRELOADS = [
  'IBMPlexSansArabic-Regular.woff2',
  'IBMPlexSansArabic-Medium.woff2',
  'IBMPlexSansArabic-SemiBold.woff2',
  'IBMPlexSansArabic-Bold.woff2',
]
  .map(
    (file) =>
      `<link rel="preload" href="/fonts/${file}" as="font" type="font/woff2" crossorigin="anonymous">`
  )
  .join('');

if (!fs.existsSync(HTML_PATH)) {
  console.error(`postbuild-web: ${HTML_PATH} not found — did expo export run first?`);
  process.exit(1);
}

let html = fs.readFileSync(HTML_PATH, 'utf8');

// 1) Default <html lang> to Arabic + add dir="rtl"
html = html.replace(/<html lang="en">/, '<html lang="ar" dir="rtl">');

// 2) Inject font preloads inside <head> if they're not already there.
//    Anchor on the </head> closing tag so the preloads sit at the
//    bottom of the head — after the CSS preload Expo emits, but
//    before the body. Order doesn't matter for parallel preload
//    fetches; placement only matters for the parser to encounter
//    them before the JS bundle starts executing.
if (!html.includes('IBMPlexSansArabic-Regular.woff2')) {
  html = html.replace('</head>', `${FONT_PRELOADS}</head>`);
}

fs.writeFileSync(HTML_PATH, html);
console.log('postbuild-web: injected RTL + 4 WOFF2 preloads into index.html');
