import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import type { CardTemplate, CardReward } from '@/types/card'

/**
 * Hard cap for card name (Arabic + English variants).
 *
 * Apple Wallet's `logoText` is the practical truncation point on a
 * real iPhone screen header — anything longer than ~24 characters gets
 * ellipsised. Google Wallet's `programName` has a similar effective
 * cap. Keeping both inputs at the same limit means the merchant can
 * see the same string render identically across the two wallets and
 * the in-app card preview without surprises.
 */
const CARD_NAME_MAX = 24

interface Props {
  card: CardTemplate
  onChange: (patch: Partial<CardTemplate>) => void
}

export function InfoTab({ card, onChange }: Props) {
  const [newReward, setNewReward] = useState<Partial<CardReward>>({
    name: '',
    stampsRequired: card.design.stampsCount,
  })

  const addReward = () => {
    if (!newReward.name || !newReward.stampsRequired) return
    const reward: CardReward = {
      id: crypto.randomUUID(),
      name: newReward.name,
      stampsRequired: Number(newReward.stampsRequired),
    }
    onChange({ rewards: [...card.rewards, reward] })
    setNewReward({ name: '', stampsRequired: card.design.stampsCount })
  }

  const removeReward = (id: string) => {
    onChange({ rewards: card.rewards.filter((r) => r.id !== id) })
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold mb-4">معلومات البطاقة</h2>

        <div className="space-y-4">
          {/* Name (Arabic + optional English). Both feed into the
              Apple Wallet `logoText` and the lock-screen notification
              title via en.lproj / ar.lproj. The English variant is
              stored on `design.nameEn` to avoid a schema migration.
              Hard-capped at 24 chars — the practical truncation point
              for `logoText` on a real iPhone screen, also matches
              Google Wallet's `programName` width. Anything longer
              gets ellipsised by the wallet UI. */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="card-name">اسم البطاقة (عربي) *</Label>
                <span
                  className={cn(
                    'text-[10px] tabular-nums',
                    card.name.length > CARD_NAME_MAX - 3
                      ? 'text-destructive'
                      : 'text-muted-foreground',
                  )}
                >
                  {card.name.length}/{CARD_NAME_MAX}
                </span>
              </div>
              <Input
                id="card-name"
                value={card.name}
                maxLength={CARD_NAME_MAX}
                onChange={(e) => onChange({ name: e.target.value })}
                placeholder="بطاقة ولاء مقهى..."
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="card-name-en">
                  Card Name (English) — optional
                </Label>
                <span
                  className={cn(
                    'text-[10px] tabular-nums',
                    (card.design.nameEn?.length ?? 0) > CARD_NAME_MAX - 3
                      ? 'text-destructive'
                      : 'text-muted-foreground',
                  )}
                >
                  {(card.design.nameEn ?? '').length}/{CARD_NAME_MAX}
                </span>
              </div>
              <Input
                id="card-name-en"
                value={card.design.nameEn ?? ''}
                maxLength={CARD_NAME_MAX}
                onChange={(e) =>
                  onChange({
                    design: { ...card.design, nameEn: e.target.value },
                  })
                }
                placeholder="Loyalty Card..."
                dir="ltr"
              />
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground -mt-2">
            يظهر الاسم على البطاقة وعلى إشعارات شاشة القفل. الحد الأقصى
            {' '}{CARD_NAME_MAX}{' '}
            حرفاً ليطابق المساحة المتاحة في محفظة آبل وقوقل. النص الإنجليزي
            اختياري — يُستخدم تلقائياً للعملاء الذين تكون لغة جهازهم
            إنجليزية. إذا لم تدخل اسماً، يُستخدم اسم النشاط من الإعدادات.
          </p>

          <div className="space-y-1.5">
            <Label htmlFor="card-desc">الوصف</Label>
            <Textarea
              id="card-desc"
              value={card.description ?? ''}
              onChange={(e) => onChange({ description: e.target.value })}
              placeholder="وصف مختصر يراه العميل عند تثبيت البطاقة"
              rows={3}
            />
          </div>
        </div>
      </div>

      <Separator />

      <div>
        <h3 className="font-semibold mb-1">المكافآت</h3>
        <p className="text-sm text-muted-foreground mb-4">
          أضف مكافأة أو أكثر يحصل عليها العميل عند إكمال عدد معين من الطوابع
        </p>

        <div className="space-y-2 mb-4">
          {card.rewards.map((r) => (
            <div
              key={r.id}
              className="flex items-center gap-3 rounded-lg border bg-card p-3"
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{r.name}</div>
                <div className="text-xs text-muted-foreground">
                  بعد {r.stampsRequired} طوابع
                </div>
              </div>
              <button
                type="button"
                onClick={() => removeReward(r.id)}
                className="text-muted-foreground hover:text-destructive p-1"
                aria-label="حذف"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}

          {card.rewards.length === 0 && (
            <div className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded-lg">
              لا توجد مكافآت بعد
            </div>
          )}
        </div>

        <div className="rounded-lg border border-dashed p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_120px] gap-2">
            <Input
              placeholder="اسم المكافأة (مثل: قهوة مجانية)"
              value={newReward.name ?? ''}
              onChange={(e) => setNewReward({ ...newReward, name: e.target.value })}
            />
            <Input
              type="number"
              min={1}
              placeholder="عدد الطوابع"
              value={newReward.stampsRequired ?? ''}
              onChange={(e) =>
                setNewReward({ ...newReward, stampsRequired: Number(e.target.value) || 0 })
              }
              dir="ltr"
            />
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={addReward}
            disabled={!newReward.name || !newReward.stampsRequired}
          >
            <Plus className="w-4 h-4 me-1.5" />
            إضافة مكافأة
          </Button>
        </div>
      </div>
    </div>
  )
}
