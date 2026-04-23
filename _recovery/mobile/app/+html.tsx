import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

/**
 * Custom HTML template injected by Expo Router for the static web
 * export. Replaces the default Expo template so we can:
 *
 *   1. **Default to Arabic + RTL** in the `<html>` element. The
 *      previous default was `lang="en"` which caused a brief LTR
 *      flash on first paint before i18next swapped to `dir="rtl"`
 *      at runtime. Most of our customers see Arabic, so making it
 *      the default eliminates the flash for the common case.
 *
 *   2. **Preload all four IBM Plex Sans Arabic WOFF2 weights** so
 *      the browser kicks off the font fetch in parallel with the
 *      CSS download instead of discovering the @font-face rules
 *      mid-render. Combined with `font-display: swap` this gives
 *      the snappiest first-paint we can achieve without inlining
 *      the fonts as base64 (which would balloon the HTML).
 *
 *   3. **Keep the existing react-native-web reset** so flex layout
 *      keeps working the same way the default template did.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />
        <title>Stamply</title>

        {/* Preload every WOFF2 weight up-front so the browser fetches
            them in parallel with the CSS file instead of waiting to
            discover the @font-face rules mid-render. `crossorigin`
            is required for font preloads even on same-origin URLs
            because the Fetch spec treats fonts as CORS-enabled. */}
        <link
          rel="preload"
          href="/fonts/IBMPlexSansArabic-Regular.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/IBMPlexSansArabic-Medium.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/IBMPlexSansArabic-SemiBold.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/IBMPlexSansArabic-Bold.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />

        {/*
          Disable body scrolling on web — react-native-web does its
          own scrolling inside ScrollView. Without this the body
          becomes scrollable on top of any RN ScrollView and the page
          gets two scrollbars.
        */}
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
