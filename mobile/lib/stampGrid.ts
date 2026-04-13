/**
 * Smart stamp-grid layout — mirrors the web build's
 * `web/src/lib/utils/stampGrid.ts` and the Laravel Apple pass builder's
 * `pickOptimalGrid()`. Any stamp count from 1 to 30 produces the SAME
 * layout across:
 *   - the mobile CardVisual (this file)
 *   - the public PWA `/i/{serial}` page (web build)
 *   - the Apple Wallet `.pkpass` strip image (PHP)
 *
 * Keeping all three in sync means a customer who jumps between the
 * native app, the web link, and the wallet pass sees the exact same
 * visual shape at every step.
 */

export type StampGridMode = 'icons' | 'simple';

export interface StampGridLayout {
  rows: number;
  cols: number;
  mode: StampGridMode;
}

/**
 * Hand-tuned overrides for small counts where the optimiser would
 * otherwise pick a single long row.
 */
const LAYOUT_OVERRIDES: Record<number, { rows: number; cols: number }> = {
  6: { rows: 2, cols: 3 },
  7: { rows: 2, cols: 4 },
};

export function pickStampGrid(stampsCount: number): StampGridLayout {
  const n = Math.max(1, Math.min(30, Math.floor(stampsCount)));

  if (LAYOUT_OVERRIDES[n]) {
    const { rows, cols } = LAYOUT_OVERRIDES[n];
    return { rows, cols, mode: n >= 13 ? 'simple' : 'icons' };
  }

  // Virtual 3.5:1 container aspect ratio — matches the Apple Wallet
  // strip image proportions used by the PHP builder.
  const W = 3.5;
  const H = 1;
  let best = { rows: 1, cols: n, score: 0 };

  for (let rows = 1; rows <= Math.min(5, n); rows++) {
    const cols = Math.ceil(n / rows);
    const cellW = W / cols;
    const cellH = H / rows;
    const score = Math.min(cellW, cellH);
    if (score > best.score) {
      best = { rows, cols, score };
    }
  }

  return {
    rows: best.rows,
    cols: best.cols,
    mode: n >= 13 ? 'simple' : 'icons',
  };
}
