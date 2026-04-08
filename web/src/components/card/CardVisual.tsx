import { useQuery } from '@tanstack/react-query'
import { QRCodeSVG } from 'qrcode.react'
import type { CardTemplate } from '@/types/card'
import { resolveLabels, computeAvailableGifts } from '@/types/card'
import { StampsGrid } from '@/components/card/StampsGrid'
import { getTenant } from '@/lib/api/tenant'
import { cn } from '@/lib/utils'

interface CardVisualProps {
  card: CardTemplate
  /** Number of stamps the customer has collected (for previews). Default 3. */
  collectedStamps?: number
  /** Customer display name shown in the secondary fields row. Defaults
   *  to a preview placeholder so the editor live preview never looks
   *  empty. */
  customerName?: string
  /**
   * Value to encode in the QR code. Defaults to a preview placeholder. For
   * real issued cards, pass the serial number.
   */
  qrValue?: string
  /** Show the QR code section. Default true. */
  showQr?: boolean
  className?: string
}

/**
 * The reusable card visual — renders a Stamply loyalty card with header,
 * stamps grid, rewards info row, QR code and brandmark.
 *
 * Used inside:
 *  - `<CardPreview>` — wraps this in an iPhone frame for the editor
 *  - `/admin/cards` list — drops this directly into each list item
 *  - Future: public issued card view, Wallet mockups, email previews, etc.
 *
 * Sizing is fluid: the visual fills its parent's width and scales naturally.
 * The QR code is a fixed 64px square at the bottom.
 */
export function CardVisual({
  card,
  collectedStamps = 3,
  customerName = 'أحمد محمد',
  qrValue = 'STAMPLY-PREVIEW',
  showQr = true,
  className,
}: CardVisualProps) {
  const { design } = card
  const labels = resolveLabels(design.labels)
  // Brand logo comes from /admin/settings → "معلومات النشاط التجاري".
  // React Query dedupes the request across every mounted CardVisual.
  const { data: tenant } = useQuery({
    queryKey: ['tenant'],
    queryFn: getTenant,
    staleTime: 60_000,
  })
  const brandLogo = design.logoUrl || tenant?.logo || null
  // Title fallback chain mirrors ApplePassBuilder::resolveLabel():
  //   1. design.labels.title  (rare per-card override, kept for parity)
  //   2. card.name            (the canonical Arabic card name)
  //   3. tenant.name          (brand name from /admin/settings)
  const displayTitle = labels.title || card.name || tenant?.name || ''
  const requiredForNext = card.rewards[0]?.stampsRequired ?? design.stampsCount
  // GIFT counter — how many full reward cycles the customer can redeem
  // RIGHT NOW. Stamply's redemption flow decrements stamps_count by
  // stamps_required on each redeem, so the live "available gifts" is
  // simple integer division.
  const availableGifts = computeAvailableGifts(collectedStamps, requiredForNext)

  return (
    // dir="ltr" on the root mirrors how Apple Wallet renders a pass:
    // the layout is fixed LTR regardless of the user's device language,
    // while individual Arabic strings inside still flow right-to-left
    // automatically thanks to Unicode bidi. This guarantees the in-app
    // card looks IDENTICAL to the Apple Wallet preview no matter
    // whether it's mounted inside an RTL or LTR parent (admin sidebar,
    // public PWA, cashier scan screen, customer detail, etc.).
    // Container styling, padding, and font sizes are pinned to match
    // ApplePassPreview 1:1 — the editor's three preview tabs (web /
    // apple / google) need to render at IDENTICAL widths so flipping
    // between them doesn't shift the layout. The Apple values are the
    // canonical source: rounded-[14px], shadow-2xl, px-4 header/secondary,
    // px-3 strip, max-h-[50px] max-w-[160px] logo, text-sm body / text-[11px]
    // labels.
    <div
      dir="ltr"
      className={cn(
        'rounded-[14px] overflow-hidden shadow-2xl flex flex-col',
        className,
      )}
      style={{
        background: design.colors.background,
        color: design.colors.foreground,
      }}
    >
      {/* Header — logo + title on the LEFT, GIFT counter on the RIGHT.
          Title is `text-sm font-medium` (NOT bold), matching customer
          name in the secondary row, so the eye doesn't read the title
          as the dominant element on the pass. */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {brandLogo && (
            <img
              src={brandLogo}
              alt=""
              className="object-contain shrink-0 max-h-[30px] max-w-[96px]"
            />
          )}
          {displayTitle && (
            <div
              className="text-sm truncate min-w-0 flex-1"
              style={{ color: design.colors.foreground }}
            >
              {displayTitle}
            </div>
          )}
        </div>
        <div className="text-right shrink-0">
          <div className="text-[11px] font-medium leading-tight mb-0.5">
            {labels.reward}
          </div>
          <div className="text-sm tabular-nums leading-tight">
            {availableGifts}
          </div>
        </div>
      </div>

      {/* Strip area — RTL island so stamp #1 sits on the right edge. */}
      <div dir="rtl" className="px-3">
        <StampsGrid
          design={design}
          collectedStamps={collectedStamps}
          rounded="0.5rem"
        />
      </div>

      {/* Secondary fields — stamps (left), customer (right). Same font
          sizes as ApplePassPreview: text-sm value, text-[11px] label. */}
      <div className="flex justify-between px-4 pt-4 pb-4 gap-3">
        <div className="text-left min-w-0 flex-1">
          <div className="text-[11px] font-medium leading-tight mb-0.5">
            {labels.stamps}
          </div>
          <div className="text-sm tabular-nums">
            {collectedStamps}/{requiredForNext}
          </div>
        </div>
        <div className="text-right min-w-0 flex-1">
          <div className="text-[11px] font-medium leading-tight mb-0.5">
            {labels.customer}
          </div>
          <div className="text-sm truncate">{customerName}</div>
        </div>
      </div>

      {/* QR code — narrow white tile that hugs the QR + serial label,
          NOT a full-width banner. Centered horizontally inside the
          card body so it sits like a "barcode card" exactly the way
          Apple Wallet renders it. */}
      {showQr && (
        <div className="px-4 pb-4 flex justify-center">
          <div className="inline-flex flex-col items-center bg-white rounded-md p-3 gap-2">
            <QRCodeSVG value={qrValue} size={108} level="M" />
            <div className="text-[11px] text-neutral-700 tracking-wider font-mono">
              {qrValue}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
