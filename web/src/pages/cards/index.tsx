import { useState } from 'react'
import { useLocation } from 'wouter'
import { FullPageLoader } from '@/components/ui/spinner'
import { Pagination } from '@/components/ui/pagination'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { usePaginatedQuery } from '@/lib/hooks/usePaginatedQuery'
import { Plus, CreditCard, Link as LinkIcon, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { DeleteButton } from '@/components/ui/delete-button'
import { EditButton } from '@/components/ui/edit-button'
import { PageHeader } from '@/components/ui/page-header'
import { CardVisual } from '@/components/card/CardVisual'
import { useI18n } from '@/i18n'
import { listCardsApi, deleteCardApi } from '@/lib/api/cards'
import { useSubscriptionGuard } from '@/lib/subscription/useSubscriptionGuard'
import type { CardTemplate } from '@/types/card'

export default function CardsListPage() {
  const { t } = useI18n()
  const [, setLocation] = useLocation()
  const qc = useQueryClient()

  const guard = useSubscriptionGuard()
  const createBlocked = guard.isExpired || !guard.canCreate('cards')
  const createBlockedMessage = guard.isExpired
    ? guard.expiredMessage
    : guard.quotaMessage('cards')

  const handleCreate = () => {
    if (createBlocked) {
      alert(createBlockedMessage)
      return
    }
    setLocation('/admin/cards/new')
  }

  const [page, setPage] = useState(1)

  const { data, isLoading, error } = usePaginatedQuery<CardTemplate>(
    ['cards'],
    (p) => listCardsApi({ page: p }),
    page,
  )
  const cards = data?.data ?? []
  const meta = data?.meta

  const deleteMutation = useMutation({
    mutationFn: deleteCardApi,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cards'] }),
  })

  return (
    <div>
      <PageHeader
        icon={<CreditCard />}
        title={t('cards')}
        subtitle="صمّم قوالب البطاقات واربطها بعملائك"
        action={
          <Button onClick={handleCreate} className={createBlocked ? 'opacity-60' : ''}>
            <Plus className="w-4 h-4 me-1.5" />
            إنشاء بطاقة
          </Button>
        }
      />

      {isLoading ? (
        <FullPageLoader />
      ) : error ? (
        <div className="text-sm text-destructive">تعذر تحميل البطاقات</div>
      ) : cards.length === 0 ? (
        <EmptyState onCreate={handleCreate} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((card) => (
            <CardItem
              key={card.id}
              card={card}
              onDelete={() => deleteMutation.mutateAsync(card.id)}
              isDeleting={
                deleteMutation.isPending && deleteMutation.variables === card.id
              }
              writeBlocked={guard.blocked}
              writeBlockedMessage={guard.isExpired ? guard.expiredMessage : ''}
            />
          ))}
        </div>
      )}

      {meta && meta.last_page > 1 && (
        <div className="mt-4">
          <Pagination meta={meta} onPageChange={setPage} />
        </div>
      )}
    </div>
  )
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="rounded-xl border-2 border-dashed border-border p-12 text-center">
      <div className="w-16 h-16 rounded-2xl bg-muted mx-auto flex items-center justify-center mb-4">
        <CreditCard className="w-8 h-8 text-muted-foreground" />
      </div>
      <h2 className="text-lg font-semibold mb-1">ابدأ بأول بطاقة</h2>
      <p className="text-sm text-muted-foreground mb-5 max-w-sm mx-auto">
        أنشئ قالب بطاقة ولاء وأضفها إلى Apple Wallet و Google Wallet لعملائك
      </p>
      <Button onClick={onCreate}>
        <Plus className="w-4 h-4 me-1.5" />
        إنشاء بطاقة
      </Button>
    </div>
  )
}

function CardItem({
  card,
  onDelete,
  isDeleting,
  writeBlocked,
  writeBlockedMessage,
}: {
  card: CardTemplate
  onDelete: () => Promise<unknown>
  isDeleting: boolean
  writeBlocked: boolean
  writeBlockedMessage: string
}) {
  const statusBadge = {
    draft: { label: 'مسودة', variant: 'secondary' as const },
    active: { label: 'نشط', variant: 'default' as const },
    inactive: { label: 'غير نشط', variant: 'outline' as const },
  }[card.status]

  const typeLabel: Record<string, string> = {
    stamp: 'ختم',
    points: 'نقاط',
    membership: 'عضوية',
    discount: 'تخفيض',
    cashback: 'استرداد نقود',
    coupon: 'قسيمة',
    multipass: 'بطاقة مرور متعددة',
    gift: 'كرت هدية',
  }

  return (
    <Card className="overflow-hidden hover:border-primary/40 transition">
      <CardHeader className="pb-3 flex flex-row items-start justify-between">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold truncate">{card.name}</h3>
          <div className="flex gap-1.5 mt-1.5">
            <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
            <Badge variant="outline">{typeLabel[card.type]}</Badge>
          </div>
        </div>
        <DeleteButton
          label="حذف البطاقة"
          title="حذف البطاقة"
          description={
            <>
              سيتم حذف <strong>{card.name}</strong> نهائياً. هذا الإجراء لا
              يمكن التراجع عنه.
            </>
          }
          confirmLabel="حذف البطاقة"
          loading={isDeleting}
          disabled={writeBlocked}
          onConfirm={() => {
            if (writeBlocked) { alert(writeBlockedMessage); return Promise.resolve() }
            return onDelete()
          }}
        />
      </CardHeader>

      <CardContent className="pb-4">
        <CardVisual card={card} collectedStamps={0} showQr={false} />
      </CardContent>

      <CardFooter className="pt-0 border-t flex items-center gap-2">
        <EditButton
          href={writeBlocked ? undefined : `/admin/cards/${card.id}`}
          onClick={writeBlocked ? () => alert(writeBlockedMessage) : undefined}
          label="تعديل البطاقة"
          disabled={writeBlocked}
        />
        <ShareLinkButton slug={card.publicSlug ?? card.id} />
        <span className="text-xs text-muted-foreground ms-auto">
          {card.design.stampsCount} طوابع
        </span>
      </CardFooter>
    </Card>
  )
}

/**
 * Copies the public registration URL `/c/:templateId` to clipboard, also
 * provides a direct "open in new tab" link.
 */
function ShareLinkButton({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false)

  const url = `${window.location.origin}/c/${slug}`

  const copy = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard blocked — fall back to opening the link
      window.open(url, '_blank', 'noopener')
    }
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={copy}
          aria-label={copied ? 'تم النسخ' : 'نسخ رابط البطاقة للعملاء'}
          className="w-10 h-10 inline-flex items-center justify-center rounded-xl bg-gray-100 text-[#635C70] hover:bg-[#8B52F6] hover:text-white transition-all duration-200"
        >
          {copied ? <Check className="w-4 h-4" /> : <LinkIcon className="w-4 h-4" />}
        </a>
      </TooltipTrigger>
      <TooltipContent>{copied ? 'تم النسخ' : 'رابط البطاقة للعملاء'}</TooltipContent>
    </Tooltip>
  )
}
