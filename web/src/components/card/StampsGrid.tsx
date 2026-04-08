import type { CSSProperties } from 'react'
import * as Icons from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { CardDesign } from '@/types/card'
import { isCustomIcon } from '@/pages/cards/editor/stampIcons'
import { pickStampGrid } from '@/lib/stampGrid'

interface StampsGridProps {
  design: CardDesign
  collectedStamps: number
  /** Override the rounded card padding (used when embedding inside a wallet pass mockup). */
  innerPadding?: string
  /** Override the rounded card background (e.g. transparent for Apple Wallet strip). */
  background?: string
  /** Border radius of the outer container. */
  rounded?: string
}

/**
 * Stamp icon — sized as a percentage of its parent circle so it scales
 * naturally with the container.
 */
function StampGlyph({
  icon,
  color,
  widthPct = 55,
  opacity = 1,
}: {
  icon: string
  color: string
  widthPct?: number
  opacity?: number
}) {
  const sizeStyle = { width: `${widthPct}%`, height: `${widthPct}%` }
  if (isCustomIcon(icon)) {
    return (
      <img
        src={icon}
        alt=""
        className="object-contain"
        style={{ ...sizeStyle, opacity }}
      />
    )
  }
  const Cmp = (Icons as unknown as Record<string, LucideIcon>)[icon] ?? Icons.Stamp
  return <Cmp className="block" style={{ ...sizeStyle, color, opacity }} />
}

/**
 * The stamp grid block — circles drawn with the smart layout from
 * `pickStampGrid`. Extracted from `<CardVisual>` so the Apple/Google
 * Wallet preview mockups can render the same grid without copying the
 * logic.
 */
export function StampsGrid({
  design,
  collectedStamps,
  innerPadding = '0.75rem',
  background,
  rounded = '0.75rem',
}: StampsGridProps) {
  const { rows, cols, mode } = pickStampGrid(design.stampsCount)
  const stamps = Array.from({ length: design.stampsCount }, (_, i) => i)
  const stampRows: number[][] = []
  for (let r = 0; r < rows; r++) {
    stampRows.push(stamps.slice(r * cols, (r + 1) * cols))
  }
  const cellWidth = `calc((100% - ${(cols - 1) * 8}px) / ${cols})`

  return (
    <div
      className="flex flex-col gap-2"
      style={{
        padding: innerPadding,
        background: background ?? design.colors.stampsBackground,
        borderRadius: rounded,
      }}
    >
      {stampRows.map((row, rowIdx) => (
        <div key={rowIdx} className="flex justify-center gap-2">
          {row.map((i) => {
            const isCollected = i < collectedStamps
            const borderColor = isCollected
              ? design.colors.activeStamp
              : design.colors.inactiveStamp
            const cellStyle: CSSProperties = {
              width: cellWidth,
              borderColor,
            }
            if (mode === 'simple' && isCollected) {
              cellStyle.background = design.colors.activeStamp
            }
            return (
              <div
                key={i}
                className="aspect-square rounded-full flex items-center justify-center border-2"
                style={cellStyle}
              >
                {mode === 'icons' &&
                  (isCollected ? (
                    <StampGlyph
                      icon={design.activeStampIcon}
                      color={design.colors.activeStamp}
                    />
                  ) : (
                    <StampGlyph
                      icon={design.inactiveStampIcon}
                      color={design.colors.inactiveStamp}
                      opacity={0.5}
                    />
                  ))}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
