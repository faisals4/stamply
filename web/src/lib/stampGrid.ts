/**
 * Smart stamp-grid layout shared between the in-app `<CardVisual>` and the
 * Apple Wallet `.pkpass` strip image.
 *
 * Mirrors `api/app/Services/Wallet/Apple/ApplePassBuilder.php::pickOptimalGrid()`
 * so any stamp count from 1 to 30 produces the SAME layout in:
 *   - the editor live preview
 *   - the customer detail page card block
 *   - the public PWA card view
 *   - the cashier scan screen
 *   - the Apple Wallet pass strip image
 */

export type StampGridMode = 'icons' | 'simple'

export interface StampGridLayout {
  rows: number
  cols: number
  /** 'icons' = render a Lucide glyph inside each circle. 'simple' = filled/hollow circle only. */
  mode: StampGridMode
}

/**
 * Pick the best (rows × cols) layout for a given stamp count.
 *
 * Strategy: try every candidate row count from 1 to 5, derive the implied
 * column count via `ceil(N / rows)`, then approximate each combination's
 * resulting cell size assuming a virtual 3:1 container aspect ratio (the
 * proportion of the Apple Wallet strip — feels balanced in every web
 * context too). The combination with the largest cell wins.
 *
 * The mode flips to 'simple' at 13 stamps because that's the count where
 * each circle drops below ~36 px in our smallest container (~232 px wide
 * editor preview), at which point a Lucide icon inside it becomes a fuzzy
 * blob and hurts more than it helps.
 */
/**
 * Hand-tuned overrides for specific small counts where the optimiser
 * would otherwise pick a single long row. Kept in sync with the
 * matching table in `ApplePassBuilder::pickOptimalGrid()` (PHP).
 *   - n=6 → 2 rows of 3
 *   - n=7 → row of 4 + row of 3 (last row centres itself)
 */
const LAYOUT_OVERRIDES: Record<number, { rows: number; cols: number }> = {
  6: { rows: 2, cols: 3 },
  7: { rows: 2, cols: 4 },
}

export function pickStampGrid(stampsCount: number): StampGridLayout {
  const n = Math.max(1, Math.min(30, Math.floor(stampsCount)))

  // Hand-tuned override path — kept identical to PHP.
  if (LAYOUT_OVERRIDES[n]) {
    const { rows, cols } = LAYOUT_OVERRIDES[n]
    return {
      rows,
      cols,
      mode: n >= 13 ? 'simple' : 'icons',
    }
  }

  // Treat the stamps area as a virtual 3.5:1 box. This matches the
  // effective grid aspect ratio of the Apple Wallet strip (375×123 with
  // internal padding gives ~3.57-3.94 depending on density). Using the
  // same target here means n=10 → 2×5, n=15 → 2×8, n=20 → 2×10,
  // n=30 → 3×10 — identical to ApplePassBuilder::pickOptimalGrid().
  const W = 3.5
  const H = 1
  let best = { rows: 1, cols: n, score: 0 }

  for (let rows = 1; rows <= Math.min(5, n); rows++) {
    const cols = Math.ceil(n / rows)
    const cellW = W / cols
    const cellH = H / rows
    const score = Math.min(cellW, cellH)
    if (score > best.score) {
      best = { rows, cols, score }
    }
  }

  return {
    rows: best.rows,
    cols: best.cols,
    mode: n >= 13 ? 'simple' : 'icons',
  }
}
