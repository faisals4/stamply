import type { MouseEvent, ReactNode } from 'react'
import { Pencil } from 'lucide-react'
import { Link } from 'wouter'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

/**
 * Unified edit button used everywhere in the app.
 *
 * Mirrors <DeleteButton /> in shape and dimensions (36×36 `w-9 h-9`)
 * so rows that have both an edit and a delete control look evenly
 * balanced. The only semantic difference is colour: hover flips the
 * background to `primary` (blue) with a white icon, matching the
 * "safe action" colour language used elsewhere in the UI.
 *
 * Two callable shapes:
 *   - Pass `href` to render a client-side <Link>. Best for pages that
 *     navigate to an editor route (`/admin/cards/:id`).
 *   - Pass `onClick` to render a plain <button>. Best for opening an
 *     inline modal in place (Locations, Staff).
 *
 * Exactly one of `href` or `onClick` is expected. Passing both falls
 * back to Link; passing neither disables the button.
 */
export interface EditButtonProps {
  /** Wouter route to navigate to. Renders the button as a <Link>. */
  href?: string
  /** Click handler. Renders the button as a <button>. */
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void
  /** Tooltip + screen-reader text. Defaults to "تعديل". */
  label?: string
  /** Extra classes merged onto the trigger. */
  className?: string
  /** Disable the button (no navigation, no click, reduced opacity). */
  disabled?: boolean
  /** Swap the icon for something custom while keeping the same chrome. */
  children?: ReactNode
}

const BASE_CLASSES =
  'w-12 h-12 sm:w-10 sm:h-10 inline-flex items-center justify-center rounded-xl bg-gray-100 text-[#635C70] shrink-0 transition-all duration-200 ' +
  'hover:bg-[#8B52F6] hover:text-white [&:hover>svg]:text-white [&:hover_svg]:text-white ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B52F6] focus-visible:ring-offset-2 ' +
  'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-gray-100 disabled:hover:text-[#635C70]'

export function EditButton({
  href,
  onClick,
  label = 'تعديل',
  className,
  disabled = false,
  children,
}: EditButtonProps) {
  const icon = children ?? <Pencil className="w-4 h-4" />

  // Link variant — wouter's <Link> renders an <a>, so we keep the
  // same styling but add `aria-disabled` for disabled state rather
  // than pulling it out of the DOM entirely.
  if (href && !onClick) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            href={disabled ? '#' : href}
            aria-label={label}
            aria-disabled={disabled || undefined}
            onClick={(e) => {
              if (disabled) e.preventDefault()
              e.stopPropagation()
            }}
            className={cn(BASE_CLASSES, className)}
          >
            {icon}
          </Link>
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
    )
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-label={label}
          onClick={(e) => {
            e.stopPropagation()
            if (!disabled) onClick?.(e)
          }}
          className={cn(BASE_CLASSES, className)}
        >
          {icon}
        </button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}
