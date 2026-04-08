import type { ReactNode } from 'react'
import { HelpCircle } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface FieldHelpProps {
  label: string
  tip: string
  htmlFor?: string
  required?: boolean
  className?: string
  children?: ReactNode
}

/**
 * Reusable label + help-tooltip wrapper. Renders the label text, a small
 * HelpCircle icon next to it that shows an explanatory tooltip on hover,
 * then the children (the actual form field) below.
 *
 * Used throughout the automation editor so every form field has a clear,
 * user-facing explanation of what it does and how it's used.
 *
 * Example:
 *   <FieldHelp
 *     label="عدد الأختام"
 *     tip="عدد الأختام التي ستُمنح للعميل تلقائياً (1-50)."
 *     htmlFor="step-count"
 *   >
 *     <Input id="step-count" type="number" />
 *   </FieldHelp>
 */
export function FieldHelp({
  label,
  tip,
  htmlFor,
  required,
  className,
  children,
}: FieldHelpProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-center gap-1.5">
        <Label htmlFor={htmlFor} className="text-sm">
          {label}
          {required && <span className="text-destructive ms-1">*</span>}
        </Label>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="text-muted-foreground/60 hover:text-foreground transition"
              tabIndex={-1}
              aria-label="شرح"
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs text-xs leading-relaxed">
            {tip}
          </TooltipContent>
        </Tooltip>
      </div>
      {children}
    </div>
  )
}
