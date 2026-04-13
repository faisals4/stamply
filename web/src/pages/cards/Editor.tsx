import { useEffect, useState } from 'react'
import { useLocation, useRoute } from 'wouter'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Save, CheckCircle2, Globe, Eye, EyeOff } from 'lucide-react'
import { FullPageLoader } from '@/components/ui/spinner'
import { BackButton } from '@/components/ui/back-button'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { getCardApi, createCardApi, updateCardApi } from '@/lib/api/cards'
import { useSubscriptionGuard } from '@/lib/subscription/useSubscriptionGuard'
import { createEmptyCardTemplate } from '@/types/card'
import type { CardTemplate } from '@/types/card'
import { CardPreview } from './CardPreview'
import { TypeTab } from './editor/TypeTab'
import { SettingsTab } from './editor/SettingsTab'
import { DesignTab } from './editor/DesignTab'
import { InfoTab } from './editor/InfoTab'
import { NotificationsTab } from './editor/NotificationsTab'

export default function CardEditorPage() {
  const [, setLocation] = useLocation()
  const [matchEdit, paramsEdit] = useRoute('/admin/cards/:id')
  const [matchNew] = useRoute('/admin/cards/new')
  const qc = useQueryClient()

  const cardId = matchEdit && paramsEdit?.id && paramsEdit.id !== 'new' ? paramsEdit.id : null

  // Load from API when editing; start with an empty template when creating.
  const { data: loadedCard, error: loadError } = useQuery({
    queryKey: ['cards', cardId],
    queryFn: () => getCardApi(cardId!),
    enabled: !!cardId,
  })

  const guard = useSubscriptionGuard()
  const isNewCard = !cardId
  // Block saves when subscription expired, or when creating a new card at quota limit
  const writeBlocked = guard.blocked || (isNewCard && !guard.canCreate('cards'))
  const writeBlockedMessage = guard.blocked
    ? guard.message
    : guard.quotaMessage('cards')

  const [card, setCard] = useState<CardTemplate | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (matchNew) {
      setCard(createEmptyCardTemplate())
    } else if (loadedCard) {
      setCard(loadedCard)
    }
  }, [matchNew, loadedCard])

  useEffect(() => {
    if (loadError) setLocation('/admin/cards')
  }, [loadError, setLocation])

  if (!card) {
    return <FullPageLoader />
  }

  const update = (patch: Partial<CardTemplate>) => {
    setCard({ ...card, ...patch })
    setSaved(false)
  }

  /** Persist the given card (defaults to current state) and return the saved copy. */
  const persist = async (toSave: CardTemplate = card): Promise<CardTemplate | null> => {
    setSaving(true)
    try {
      const result = cardId
        ? await updateCardApi(cardId, toSave)
        : await createCardApi(toSave)
      qc.invalidateQueries({ queryKey: ['cards'] })
      return result
    } catch {
      alert('تعذر حفظ البطاقة')
      return null
    } finally {
      setSaving(false)
    }
  }

  const handleSave = async () => {
    const result = await persist()
    if (!result) return
    setCard(result)
    setSaved(true)
    // If it was a new card, switch URL to the edit route so subsequent saves update it
    if (!cardId) setLocation(`/admin/cards/${result.id}`)
    setTimeout(() => setSaved(false), 3500)
  }

  const handleSaveAndExit = async () => {
    const result = await persist()
    if (result) setLocation('/admin/cards')
  }

  /** Flip status + persist in a single atomic step (avoids stale closure). */
  const handlePublishToggle = async (nextStatus: 'active' | 'draft') => {
    const next = { ...card, status: nextStatus } as CardTemplate
    setCard(next)
    const result = await persist(next)
    if (result) {
      setCard(result)
      setSaved(true)
      setTimeout(() => setSaved(false), 3500)
    }
  }

  return (
    <div>
      {/* Header */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6 pb-4 border-b">
        <div className="flex items-center gap-3 min-w-0">
          <BackButton href="/admin/cards" iconOnly ariaLabel="رجوع" />
          <div className="min-w-0">
            <h1 className="font-semibold text-lg truncate">
              {card.name || 'بطاقة جديدة'}
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant={card.status === 'active' ? 'default' : 'secondary'}>
                {card.status === 'draft' ? 'مسودة' : card.status === 'active' ? 'نشط' : 'غير نشط'}
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {saved && (
            <span className="text-sm text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" />
              تم الحفظ
            </span>
          )}

          {/* Publish / unpublish — atomic; flips status AND saves in one go */}
          {card.status === 'active' ? (
            <Button
              variant="outline"
              onClick={() => writeBlocked ? alert(writeBlockedMessage) : handlePublishToggle('draft')}
              disabled={saving}
              title="سيخفي البطاقة ويوقف التسجيلات الجديدة"
            >
              <EyeOff className="w-4 h-4 me-1.5" />
              إلغاء النشر
            </Button>
          ) : (
            <Button
              onClick={() => writeBlocked ? alert(writeBlockedMessage) : handlePublishToggle('active')}
              disabled={saving}
              className={writeBlocked ? 'bg-emerald-600/50' : 'bg-emerald-600 hover:bg-emerald-700'}
              title="سيجعل البطاقة متاحة للعملاء عبر رابط المشاركة"
            >
              <Globe className="w-4 h-4 me-1.5" />
              {saving ? 'جارٍ النشر...' : 'نشر البطاقة'}
            </Button>
          )}

          <Button
            variant="outline"
            onClick={() => writeBlocked ? alert(writeBlockedMessage) : handleSave()}
            disabled={saving}
          >
            <Save className="w-4 h-4 me-1.5" />
            {saving ? 'جارٍ الحفظ...' : 'حفظ'}
          </Button>
          <Button
            onClick={() => writeBlocked ? alert(writeBlockedMessage) : handleSaveAndExit()}
            disabled={saving}
            className={writeBlocked ? 'opacity-60' : ''}
          >
            حفظ وخروج
          </Button>
        </div>
      </header>

      {/* Draft warning */}
      {card.status !== 'active' && (
        <div className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-900 px-4 py-3 text-sm flex items-start gap-2">
          <Eye className="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            <strong>هذه البطاقة لم تُنشر بعد.</strong> لا يمكن للعملاء الوصول إلى رابط التسجيل حتى تضغط "نشر البطاقة" أعلاه.
          </div>
        </div>
      )}

      {/* Layout: tabs on the left, live preview on the right */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4 lg:gap-8">
        <div className="min-w-0">
          <Tabs defaultValue="type">
            <TabsList className="mb-6 w-full justify-start overflow-x-auto max-w-full">
              <TabsTrigger value="type">نوع البطاقة</TabsTrigger>
              <TabsTrigger value="settings">إعدادات</TabsTrigger>
              <TabsTrigger value="design">تصميم</TabsTrigger>
              <TabsTrigger value="info">معلومات</TabsTrigger>
              {/* Notifications tab requires a persisted card (it
                  edits a JSON column on card_templates). We hide it
                  for brand-new cards until the merchant saves the
                  template once. */}
              {cardId && <TabsTrigger value="notifications">التنبيهات</TabsTrigger>}
            </TabsList>

            <TabsContent value="type">
              <TypeTab value={card.type} onChange={(type) => update({ type })} />
            </TabsContent>

            <TabsContent value="settings">
              <SettingsTab
                value={card.settings}
                onChange={(settings) => update({ settings })}
                locationIds={card.locationIds}
                onLocationIdsChange={(locationIds) => update({ locationIds })}
              />
            </TabsContent>

            <TabsContent value="design">
              <DesignTab
                value={card.design}
                onChange={(design) => update({ design })}
              />
            </TabsContent>

            <TabsContent value="info">
              <InfoTab card={card} onChange={update} />
            </TabsContent>

            {cardId && (
              <TabsContent value="notifications">
                <NotificationsTab card={card} onChange={update} />
              </TabsContent>
            )}
          </Tabs>
        </div>

        <div className="order-first lg:order-last lg:self-start lg:sticky lg:top-6">
          <CardPreview card={card} />
        </div>
      </div>
    </div>
  )
}
