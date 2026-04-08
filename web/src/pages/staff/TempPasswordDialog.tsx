import { useState } from 'react'
import { Copy, Check, KeyRound } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/i18n'

interface Props {
  password: string | null
  onClose: () => void
}

/**
 * Shown once after create-user or reset-password. Displays the temp password
 * in a large code block with a copy button, then the admin must manually
 * deliver it to the user.
 */
export function TempPasswordDialog({ password, onClose }: Props) {
  const { t } = useI18n()
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (!password) return
    try {
      await navigator.clipboard.writeText(password)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // ignore — clipboard might be unavailable in insecure contexts
    }
  }

  return (
    <Dialog open={!!password} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="w-12 h-12 rounded-full bg-amber-500/15 text-amber-600 flex items-center justify-center mb-3">
            <KeyRound className="w-6 h-6" />
          </div>
          <DialogTitle>{t('tempPasswordTitle')}</DialogTitle>
          <DialogDescription>{t('tempPasswordHint')}</DialogDescription>
        </DialogHeader>

        <div className="mt-2 rounded-lg border border-border bg-muted p-4 flex items-center justify-between gap-2">
          <code className="font-mono text-base font-semibold flex-1 truncate" dir="ltr">
            {password}
          </code>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="shrink-0"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 me-1.5" />
                تم النسخ
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 me-1.5" />
                نسخ
              </>
            )}
          </Button>
        </div>

        <DialogFooter>
          <Button onClick={onClose}>تم</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
