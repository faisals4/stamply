import {
  Coffee,
  Gift,
  Crown,
  Percent,
  DollarSign,
  Ticket,
  Tickets,
  CreditCard,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CardType } from '@/types/card'

interface Props {
  value: CardType
  onChange: (type: CardType) => void
}

interface TypeOption {
  type: CardType
  label: string
  description: string
  icon: typeof Coffee
  badge?: string
  ready: boolean
}

const TYPES: TypeOption[] = [
  {
    type: 'stamp',
    label: 'ختم',
    description: 'اشترِ N مرات واحصل على مكافأة مجانية — الأكثر شعبية للمقاهي والمطاعم',
    icon: Coffee,
    badge: 'احتفاظ عالي',
    ready: true,
  },
  {
    type: 'points',
    label: 'نقاط',
    description: 'جمع نقاط مع كل عملية شراء واستبدلها بمكافآت متنوعة',
    icon: Gift,
    badge: 'احتفاظ عالي',
    ready: false,
  },
  {
    type: 'membership',
    label: 'عضوية',
    description: 'بطاقات عضوية بمستويات (برونزي/فضي/ذهبي) مع مزايا مختلفة',
    icon: Crown,
    badge: 'VIP',
    ready: false,
  },
  {
    type: 'discount',
    label: 'تخفيض دائم',
    description: 'بطاقة تمنح خصماً ثابتاً في كل زيارة',
    icon: Percent,
    ready: false,
  },
  {
    type: 'cashback',
    label: 'استرداد النقود',
    description: 'إعادة نسبة من قيمة الشراء للعميل كرصيد قابل للاستخدام',
    icon: DollarSign,
    badge: 'قيمة عالية',
    ready: false,
  },
  {
    type: 'coupon',
    label: 'قسيمة',
    description: 'عرض ترويجي محدد بتاريخ انتهاء — مثالي للاستحواذ',
    icon: Ticket,
    badge: 'الأفضل للاستحواذ',
    ready: false,
  },
  {
    type: 'multipass',
    label: 'بطاقة مرور متعددة',
    description: 'باقة مدفوعة مسبقاً لعدد محدد من الزيارات (مثل 10 حصص)',
    icon: Tickets,
    ready: false,
  },
  {
    type: 'gift',
    label: 'كرت هدية',
    description: 'بطاقة هدية قابلة للتعبئة يستخدمها العميل كرصيد',
    icon: CreditCard,
    ready: false,
  },
]

export function TypeTab({ value, onChange }: Props) {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-1">نوع البطاقة</h2>
      <p className="text-sm text-muted-foreground mb-6">
        اختر نموذج الولاء الأنسب لنشاطك التجاري
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {TYPES.map((t) => {
          const Icon = t.icon
          const isSelected = value === t.type
          return (
            <button
              key={t.type}
              type="button"
              disabled={!t.ready}
              onClick={() => onChange(t.type)}
              className={cn(
                'relative rounded-xl border-2 p-4 text-start transition',
                isSelected
                  ? 'border-primary bg-primary/5 shadow-sm'
                  : 'border-border bg-card hover:border-primary/40',
                !t.ready && 'opacity-60 cursor-not-allowed hover:border-border',
              )}
            >
              {!t.ready && (
                <span className="absolute top-2 end-2 text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                  قريباً
                </span>
              )}
              {t.badge && t.ready && (
                <span className="absolute top-2 end-2 text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  <Sparkles className="w-2.5 h-2.5 inline me-0.5" />
                  {t.badge}
                </span>
              )}
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
                    isSelected
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-foreground',
                  )}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm">{t.label}</div>
                  <div className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    {t.description}
                  </div>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
