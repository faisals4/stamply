import { useQuery } from '@tanstack/react-query'
import { QRCodeSVG } from 'qrcode.react'
import type { CardTemplate } from '@/types/card'
import { resolveLabels, computeAvailableGifts } from '@/types/card'
import { StampsGrid } from '@/components/card/StampsGrid'
import { getTenant } from '@/lib/tenantApi'

interface Props {
  card: CardTemplate
  collectedStamps?: number
  customerName?: string
}

/**
 * Visual mockup of how this card looks inside Google Wallet on Android.
 *
 * Google Wallet's `LoyaltyObject` (loyalty class) layout:
 *   - Header strip in the program color: small logo + program name +
 *     account name on the right
 *   - Below: the customer's account number / loyalty points (we use a
 *     "X / N stamps" line + the visual stamp grid as a hero image)
 *   - QR / barcode section at the bottom
 *
 * The real Google Wallet renders the program color band differently
 * from Apple's full-bleed background — only the top section uses the
 * brand color, and the body sits on a neutral white card.
 */
export function GooglePassPreview({
  card,
  collectedStamps = 3,
  customerName = 'أحمد محمد',
}: Props) {
  const { design, rewards } = card
  const stampsRequired = rewards[0]?.stampsRequired ?? design.stampsCount
  const labels = resolveLabels(design.labels)
  // Brand logo from /admin/settings — single source of truth across
  // the in-app CardVisual, the Apple preview and this Google preview.
  const { data: tenant } = useQuery({
    queryKey: ['tenant'],
    queryFn: getTenant,
    staleTime: 60_000,
  })
  const brandLogo = design.logoUrl || tenant?.logo || null
  // Title chain: design.labels.title → card.name → tenant.name
  const displayTitle = labels.title || card.name || tenant?.name || ''
  // GIFT counter — available redemptions, shown opposite the logo to
  // mirror the Apple Wallet header layout across surfaces.
  const availableGifts = computeAvailableGifts(collectedStamps, stampsRequired)

  return (
    // dir="ltr" mirrors how Google Wallet (and Apple Wallet) render
    // pass layouts: structurally LTR regardless of device language,
    // with individual Arabic strings flowing right-to-left automatically
    // via Unicode bidi inside their text containers.
    <div
      dir="ltr"
      className="rounded-[14px] overflow-hidden shadow-2xl bg-white border border-neutral-200"
    >
      {/* Header — pinned to ApplePassPreview's exact dimensions:
          px-4 pt-4 pb-3, max-h-[50px] max-w-[160px] logo, text-sm
          (regular weight) title, text-[11px] header label. */}
      <div
        className="flex items-center justify-between px-4 pt-4 pb-3 gap-3"
        style={{
          background: design.colors.background,
          color: design.colors.foreground,
        }}
      >
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

      {/* Hero stamps grid — RTL island so stamp #1 sits on the right
          edge. Same px-3 padding as the Apple preview. */}
      <div dir="rtl" className="px-3">
        <StampsGrid
          design={design}
          collectedStamps={collectedStamps}
          rounded="0.5rem"
        />
      </div>

      {/* Details row — same px-4 pt-4 pb-4 spacing and text-sm /
          text-[11px] sizes as the Apple preview's secondary fields. */}
      <div
        className="flex justify-between px-4 pt-4 pb-4 gap-3"
        style={{ color: design.colors.foreground }}
      >
        <div className="text-left min-w-0 flex-1">
          <div className="text-[11px] font-medium leading-tight mb-0.5">
            {labels.stamps}
          </div>
          <div className="text-sm tabular-nums">
            {collectedStamps}/{stampsRequired}
          </div>
        </div>
        <div className="text-right min-w-0 flex-1">
          <div className="text-[11px] font-medium leading-tight mb-0.5">
            {labels.customer}
          </div>
          <div className="text-sm truncate">{customerName}</div>
        </div>
      </div>

      {/* QR section — narrow white tile hugging QR + serial, centered
          inside the pass body. Same width treatment as the Apple
          preview so the three editor tabs render identically. */}
      <div className="px-4 pb-4 flex justify-center">
        <div className="inline-flex flex-col items-center bg-white rounded-md p-3 gap-2">
          <QRCodeSVG value="STAMPLY-PREVIEW" size={108} level="M" />
          <div className="text-[11px] text-neutral-700 tracking-wider font-mono">
            PREVIEW
          </div>
        </div>
      </div>
    </div>
  )
}
