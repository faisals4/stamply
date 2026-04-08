import { Info } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

interface Props {
  /** Short explanation shown on hover. Can be a single line or a short paragraph. */
  text: string
  className?: string
}

/**
 * Small info-icon (ⓘ) rendered next to a field label. Hovering or focusing it
 * reveals a tooltip with a short explanation for end users.
 */
export function InfoHint({ text, className }: Props) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label="شرح"
          className={`inline-flex items-center justify-center text-muted-foreground hover:text-foreground transition ${className ?? ''}`}
        >
          <Info className="w-3.5 h-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-xs leading-relaxed">
        {text}
      </TooltipContent>
    </Tooltip>
  )
}
