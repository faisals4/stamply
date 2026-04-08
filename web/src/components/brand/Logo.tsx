import { cn } from '@/lib/utils'

interface LogoProps {
  /**
   * Pixel HEIGHT of the logo. Width auto-scales to preserve the source
   * aspect ratio. Defaults to 32px.
   */
  height?: number
  /**
   * Color variant:
   *  - `'default'` (dark wordmark on light backgrounds)
   *  - `'white'`   (light wordmark for dark/brand backgrounds like footers
   *                 and the final CTA section)
   */
  variant?: 'default' | 'white'
  className?: string
}

/**
 * Single source of truth for the Stamply brand mark.
 *
 * Two assets are bundled:
 *   - `/logo-stamply.png`        — dark wordmark on transparent background
 *   - `/logo-stamply-white.png`  — white wordmark on transparent background
 *
 * Both images contain the wordmark — never render a separate "Stamply"
 * text label next to them.
 */
export function Logo({ height = 32, variant = 'default', className }: LogoProps) {
  const src = variant === 'white' ? '/logo-stamply-white.png' : '/logo-stamply.png'
  return (
    <img
      src={src}
      alt="Stamply"
      style={{ height, width: 'auto' }}
      className={cn('object-contain shrink-0 select-none', className)}
      draggable={false}
    />
  )
}
