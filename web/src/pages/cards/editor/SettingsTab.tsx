import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { InfoHint } from '@/components/ui/info-hint'
import type { CardSettings, BarcodeType, RegistrationField } from '@/types/card'
import { LocationPicker } from '@/components/locations/LocationPicker'
import { RegistrationFieldsEditor } from './RegistrationFieldsEditor'

interface Props {
  value: CardSettings
  onChange: (settings: CardSettings) => void
  /** Branches linked to this card via the `card_template_location`
   *  pivot. When the customer's iPhone enters one of these locations,
   *  the wallet pass surfaces on the lock screen. Optional so the
   *  component still works in places that don't pass the value yet. */
  locationIds?: number[]
  onLocationIdsChange?: (ids: number[]) => void
}

/** Reusable label + info-hint row. */
function HintLabel({
  htmlFor,
  children,
  hint,
}: {
  htmlFor?: string
  children: React.ReactNode
  hint: string
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Label htmlFor={htmlFor}>{children}</Label>
      <InfoHint text={hint} />
    </div>
  )
}

export function SettingsTab({
  value,
  onChange,
  locationIds,
  onLocationIdsChange,
}: Props) {
  const update = (patch: Partial<CardSettings>) => onChange({ ...value, ...patch })

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold mb-4">إعدادات</h2>

        {/* Barcode type */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Label>نوع الباركود</Label>
            <InfoHint text="الشكل الذي يُعرض به الكود على البطاقة لمسحه من قِبَل الموظف. QR Code هو الأنسب لأغلب الحالات، و PDF 417 يستخدم في أنظمة POS القديمة." />
          </div>
          <RadioGroup
            value={value.barcodeType}
            onValueChange={(v) => update({ barcodeType: v as BarcodeType })}
            className="flex gap-6"
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem value="qrcode" id="br-qr" />
              <Label htmlFor="br-qr" className="font-normal cursor-pointer">QR Code</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="pdf417" id="br-pdf" />
              <Label htmlFor="br-pdf" className="font-normal cursor-pointer">PDF 417</Label>
            </div>
          </RadioGroup>
        </div>
      </div>

      <Separator />

      {/* Expiration */}
      <div>
        <div className="flex items-center gap-1.5 mb-3">
          <h3 className="font-semibold">انتهاء الصلاحية</h3>
          <InfoHint text="متى تنتهي صلاحية البطاقة أو الأختام التي جمعها العميل. اتركها فارغة إذا لا تريد حدّاً زمنياً." />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <HintLabel
              htmlFor="card-exp"
              hint="عدد الأيام بعد إصدار البطاقة التي تصبح فيها منتهية الصلاحية ولا يمكن استخدامها. مثال: 365 = البطاقة صالحة لسنة كاملة من يوم التسجيل. اتركه فارغاً لبطاقة دائمة."
            >
              عمر البطاقة (أيام)
            </HintLabel>
            <Input
              id="card-exp"
              type="number"
              min={0}
              placeholder="غير محدود"
              value={value.expirationDays ?? ''}
              onChange={(e) =>
                update({ expirationDays: e.target.value ? Number(e.target.value) : null })
              }
              dir="ltr"
            />
          </div>
          <div className="space-y-1.5">
            <HintLabel
              htmlFor="stamp-exp"
              hint="عمر الختم الواحد بعد كسبه. مثال: 60 يعني كل ختم ينتهي بعد 60 يوم من تاريخ الحصول عليه — يشجّع العميل على زيارات متقاربة. اتركه فارغاً لأختام دائمة."
            >
              عمر الختم (أيام)
            </HintLabel>
            <Input
              id="stamp-exp"
              type="number"
              min={0}
              placeholder="غير محدود"
              value={value.stampLifetimeDays ?? ''}
              onChange={(e) =>
                update({ stampLifetimeDays: e.target.value ? Number(e.target.value) : null })
              }
              dir="ltr"
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Bonus stamps */}
      <div>
        <h3 className="font-semibold mb-3">طوابع المكافآت</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <HintLabel
              htmlFor="welcome-stamps"
              hint="عدد الأختام التي يحصل عليها العميل مجاناً عند تسجيله للمرة الأولى وإصدار البطاقة. تُستخدم كمحفّز للتسجيل وتجعل العميل يبدأ برصيد إيجابي بدل الصفر. مثال: 1 يعني كل عميل جديد يبدأ بختم واحد هدية."
            >
              طوابع عند إصدار البطاقة
            </HintLabel>
            <Input
              id="welcome-stamps"
              type="number"
              min={0}
              value={value.welcomeStamps}
              onChange={(e) => update({ welcomeStamps: Number(e.target.value) || 0 })}
              dir="ltr"
            />
          </div>
          <div className="space-y-1.5">
            <HintLabel
              htmlFor="birthday-stamps"
              hint="عدد الأختام التي يضيفها النظام تلقائياً لبطاقة العميل في يوم عيد ميلاده، مع إشعار على شاشة قفل الهاتف. هدية تُذكّره بعلامتك التجارية وتدفعه للزيارة في يومه المميز. يتطلب حقل تاريخ الميلاد في نموذج التسجيل."
            >
              طوابع أعياد الميلاد 🎂
            </HintLabel>
            <Input
              id="birthday-stamps"
              type="number"
              min={0}
              value={value.birthdayStamps}
              onChange={(e) => update({ birthdayStamps: Number(e.target.value) || 0 })}
              dir="ltr"
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Limits */}
      <div>
        <div className="flex items-center gap-1.5 mb-3">
          <h3 className="font-semibold">حدود</h3>
          <InfoHint text="قيود لحماية نظامك من الاستخدام الخاطئ أو الاحتيال. اتركها فارغة لعدم تطبيق أي حد." />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <HintLabel
              htmlFor="max-per-day"
              hint="أكبر عدد من الأختام التي يمكن للعميل الواحد أن يحصل عليها في يوم واحد. يمنع موظف من إعطاء عشرات الأختام لنفس العميل عبر فواتير وهمية. مثال: 1 يعني ختم واحد فقط لكل عميل يومياً مهما زار."
            >
              حد الطوابع في اليوم الواحد
            </HintLabel>
            <Input
              id="max-per-day"
              type="number"
              min={0}
              placeholder="بدون حد"
              value={value.maxStampsPerDay ?? ''}
              onChange={(e) =>
                update({ maxStampsPerDay: e.target.value ? Number(e.target.value) : null })
              }
              dir="ltr"
            />
          </div>
          <div className="space-y-1.5">
            <HintLabel
              htmlFor="max-cards"
              hint="أقصى عدد من البطاقات التي يمكن إصدارها من هذا القالب. عند بلوغ الحد تتوقف التسجيلات الجديدة تلقائياً. مفيد لعروض محدودة (مثلاً: أول 100 عميل فقط)."
            >
              حد البطاقات الصادرة
            </HintLabel>
            <Input
              id="max-cards"
              type="number"
              min={0}
              placeholder="بدون حد"
              value={value.maxIssuedCards ?? ''}
              onChange={(e) =>
                update({ maxIssuedCards: e.target.value ? Number(e.target.value) : null })
              }
              dir="ltr"
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Geofence locations — links to card_template_location pivot.
          Only renders when the parent passed the props (so other usages
          of <SettingsTab> stay backwards-compatible). */}
      {onLocationIdsChange && (
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <h3 className="font-semibold">الفروع المرتبطة</h3>
            <InfoHint text="اختر الفروع التي تظهر فيها هذه البطاقة كإشعار على شاشة قفل العميل عند الاقتراب من نطاق الفرع. حد أقصى 10 فروع لكل بطاقة (متطلّب آبل)." />
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            لما العميل يقترب من أي من هذه الفروع، تظهر بطاقته على شاشة القفل في محفظة آبل أو قوقل
          </p>
          <LocationPicker
            value={locationIds ?? []}
            onChange={onLocationIdsChange}
          />
        </div>
      )}

      <Separator />

      {/* Registration form fields */}
      <RegistrationFieldsEditor
        value={value.registrationFields ?? []}
        onChange={(fields: RegistrationField[]) =>
          update({ registrationFields: fields })
        }
      />
    </div>
  )
}
