import { useEffect, useMemo, useState } from 'react'
import { useLocation, useRoute } from 'wouter'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import {
  Save,
  Loader2,
  PlayCircle,
  Pause,
  FileText,
  TestTube2,
  Plus,
  UserPlus,
  Cake,
  Clock,
  Send,
  Mail,
  Bell,
  Stamp as StampIcon,
  Trash2,
  GitBranch,
  StopCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { FieldHelp } from '@/components/ui/field-help'
import { cn } from '@/lib/utils'
import {
  getAutomation,
  createAutomation,
  updateAutomation,
  setAutomationStatus,
  testAutomation,
  type AutomationStatus,
  type AutomationTrigger,
  type AutomationStepType,
  type AutomationStep,
  type AutomationFlow,
} from '@/lib/automationsApi'
import { AutomationRuns } from './automation/AutomationRuns'
import { BackButton } from '@/components/ui/back-button'

/**
 * /admin/automations/new and /admin/automations/:id
 *
 * The full builder: metadata header, trigger picker, linear step list with
 * "+ Add step" inserters between cards, inline edit forms per step type,
 * action bar with save / test / status toggle, and a "Recent runs" tab.
 *
 * Every field in the editor is wrapped in <FieldHelp> so the merchant
 * always has a tooltip explaining exactly what it does.
 */
export default function AutomationEditPage() {
  const [, setLocation] = useLocation()
  const [isNewRoute] = useRoute('/admin/automations/new')
  const [, params] = useRoute('/admin/automations/:id')
  const id = isNewRoute ? null : params?.id
  const qc = useQueryClient()

  const { data: automation, isLoading } = useQuery({
    queryKey: ['automations', 'detail', id],
    queryFn: () => getAutomation(id!),
    enabled: !!id,
  })

  // Local form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [triggerType, setTriggerType] = useState<AutomationTrigger>('card_issued')
  const [inactiveDays, setInactiveDays] = useState(30)
  const [steps, setSteps] = useState<AutomationStep[]>([
    { id: genId(), type: 'send_sms', config: { body: 'مرحبا {{customer.first_name}}!' } },
  ])
  const [error, setError] = useState<string | null>(null)
  const [savedFlash, setSavedFlash] = useState(false)
  const [activeTab, setActiveTab] = useState<'editor' | 'runs'>('editor')

  useEffect(() => {
    if (!automation) return
    setName(automation.name)
    setDescription(automation.description ?? '')
    setTriggerType(automation.trigger_type)
    if (typeof automation.trigger_config?.inactive_days === 'number') {
      setInactiveDays(automation.trigger_config.inactive_days)
    }
    const loaded = automation.flow_json?.steps ?? []
    if (loaded.length > 0) setSteps(loaded)
  }, [automation])

  const flow: AutomationFlow = useMemo(() => ({ steps }), [steps])

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name,
        description: description || null,
        trigger_type: triggerType,
        trigger_config: triggerType === 'inactive' ? { inactive_days: inactiveDays } : {},
        flow_json: flow,
      }
      return id ? updateAutomation(id, payload) : createAutomation(payload)
    },
    onSuccess: (auto) => {
      qc.invalidateQueries({ queryKey: ['automations'] })
      qc.invalidateQueries({ queryKey: ['automations', 'detail', id] })
      setSavedFlash(true)
      setTimeout(() => setSavedFlash(false), 3500)
      if (!id) setLocation(`/admin/automations/${auto.id}`)
    },
    onError: (err) => setError(extractError(err) ?? 'تعذر الحفظ'),
  })

  const statusMutation = useMutation({
    mutationFn: (status: AutomationStatus) => setAutomationStatus(id!, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['automations'] })
      qc.invalidateQueries({ queryKey: ['automations', 'detail', id] })
    },
  })

  const testMutation = useMutation({
    mutationFn: () => testAutomation(id!),
    onSuccess: (result) => {
      alert(`✓ تم التشغيل التجريبي — الحالة: ${result.status}`)
      qc.invalidateQueries({ queryKey: ['automations', 'detail', id] })
    },
    onError: (err) => setError(extractError(err) ?? 'تعذر التشغيل التجريبي'),
  })

  const addStep = (afterIndex: number, type: AutomationStepType) => {
    const newStep: AutomationStep = {
      id: genId(),
      type,
      config: defaultConfigFor(type),
    }
    const copy = [...steps]
    copy.splice(afterIndex + 1, 0, newStep)
    setSteps(copy)
  }

  const updateStep = (index: number, config: Record<string, unknown>) => {
    const copy = [...steps]
    copy[index] = { ...copy[index], config }
    setSteps(copy)
  }

  const removeStep = (index: number) => {
    if (steps.length === 1) {
      alert('يجب أن تحتوي الأتمتة على خطوة واحدة على الأقل')
      return
    }
    setSteps(steps.filter((_, i) => i !== index))
  }

  if (isLoading && id) {
    return <div className="text-sm text-muted-foreground">جارٍ التحميل...</div>
  }

  const status: AutomationStatus = automation?.status ?? 'draft'

  return (
    <div className="max-w-5xl">
      <BackButton href="/admin/automations" label="الأتمتة" />

      <header className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">
            {id ? 'تعديل أتمتة' : 'أتمتة جديدة'}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            اصنع سيناريو تلقائي يعمل لكل عميل حسب الشرط الذي تحدّده
          </p>
        </div>
        {id && <StatusPill status={status} />}
      </header>

      {id && (
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'editor' | 'runs')}>
          <TabsList className="mb-6">
            <TabsTrigger value="editor">المحرر</TabsTrigger>
            <TabsTrigger value="runs">سجل التشغيل</TabsTrigger>
          </TabsList>
          <TabsContent value="runs">
            <AutomationRuns automationId={Number(id)} />
          </TabsContent>
          <TabsContent value="editor">
            <EditorBody
              name={name} setName={setName}
              description={description} setDescription={setDescription}
              triggerType={triggerType} setTriggerType={setTriggerType}
              inactiveDays={inactiveDays} setInactiveDays={setInactiveDays}
              steps={steps} setSteps={setSteps}
              addStep={addStep} updateStep={updateStep} removeStep={removeStep}
            />
          </TabsContent>
        </Tabs>
      )}

      {!id && (
        <EditorBody
          name={name} setName={setName}
          description={description} setDescription={setDescription}
          triggerType={triggerType} setTriggerType={setTriggerType}
          inactiveDays={inactiveDays} setInactiveDays={setInactiveDays}
          steps={steps} setSteps={setSteps}
          addStep={addStep} updateStep={updateStep} removeStep={removeStep}
        />
      )}

      {error && <p className="text-sm text-destructive mt-4">{error}</p>}

      {/* Bottom action bar — sticky for convenience */}
      {(!id || activeTab === 'editor') && (
        <div className="mt-6 rounded-xl border bg-card p-4 flex items-center gap-3 flex-wrap sticky bottom-4">
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin me-1.5" />
            ) : (
              <Save className="w-4 h-4 me-1.5" />
            )}
            حفظ
          </Button>

          {id && (
            <>
              {status === 'draft' || status === 'paused' ? (
                <Button
                  variant="outline"
                  onClick={() => statusMutation.mutate('active')}
                  disabled={statusMutation.isPending}
                  className="border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10"
                >
                  <PlayCircle className="w-4 h-4 me-1.5" />
                  تفعيل
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => statusMutation.mutate('paused')}
                  disabled={statusMutation.isPending}
                  className="border-amber-500/40 text-amber-700 hover:bg-amber-500/10"
                >
                  <Pause className="w-4 h-4 me-1.5" />
                  إيقاف مؤقت
                </Button>
              )}

              <Button
                variant="outline"
                onClick={() => testMutation.mutate()}
                disabled={testMutation.isPending}
              >
                {testMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin me-1.5" />
                ) : (
                  <TestTube2 className="w-4 h-4 me-1.5" />
                )}
                تشغيل تجريبي
              </Button>
            </>
          )}

          {savedFlash && <span className="text-xs text-emerald-600">تم الحفظ ✓</span>}
        </div>
      )}
    </div>
  )
}

/* ─── Editor body ──────────────────────────────────────────────── */

function EditorBody(props: {
  name: string; setName: (v: string) => void
  description: string; setDescription: (v: string) => void
  triggerType: AutomationTrigger; setTriggerType: (v: AutomationTrigger) => void
  inactiveDays: number; setInactiveDays: (v: number) => void
  steps: AutomationStep[]; setSteps: (s: AutomationStep[]) => void
  addStep: (afterIndex: number, type: AutomationStepType) => void
  updateStep: (index: number, config: Record<string, unknown>) => void
  removeStep: (index: number) => void
}) {
  const { name, setName, description, setDescription, triggerType, setTriggerType, inactiveDays, setInactiveDays, steps, addStep, updateStep, removeStep } = props

  return (
    <>
      {/* Metadata */}
      <section className="rounded-xl border bg-card p-5 space-y-4 mb-6">
        <h2 className="font-semibold text-sm text-muted-foreground">المعلومات الأساسية</h2>

        <FieldHelp
          label="اسم الأتمتة"
          tip="اسم مختصر يعبّر عن الغرض، مثل: «سلسلة الترحيب» أو «مكافأة عيد الميلاد». يظهر فقط لك وللمدراء في لوحة التحكم."
          htmlFor="auto-name"
          required
        >
          <Input
            id="auto-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="مثلاً: سلسلة الترحيب"
          />
        </FieldHelp>

        <FieldHelp
          label="الوصف"
          tip="وصف اختياري يشرح ماذا تفعل هذه الأتمتة. مفيد لتذكير المدراء لاحقاً بسبب إنشائها."
          htmlFor="auto-desc"
        >
          <Textarea
            id="auto-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="مثلاً: ترحيب بالعملاء الجدد + تذكير بعد يوم"
          />
        </FieldHelp>
      </section>

      {/* Trigger picker */}
      <section className="rounded-xl border bg-card p-5 space-y-4 mb-6">
        <h2 className="font-semibold text-sm text-muted-foreground flex items-center gap-1.5">
          🎯 المُشغّل
          <TriggerHelp />
        </h2>
        <TriggerPicker value={triggerType} onChange={setTriggerType} />

        {triggerType === 'inactive' && (
          <FieldHelp
            label="عدد أيام عدم النشاط"
            tip="عدد الأيام التي يجب أن يمضيها العميل بدون أي ختم جديد قبل أن تُشغَّل هذه الأتمتة عليه. مثال: ٣٠ يوم يعني نستهدف العملاء الذين لم يزوروا شهراً كاملاً."
            htmlFor="inactive-days"
          >
            <Input
              id="inactive-days"
              type="number"
              min={1}
              max={365}
              value={inactiveDays}
              onChange={(e) => setInactiveDays(Number(e.target.value))}
              className="max-w-xs"
            />
          </FieldHelp>
        )}
      </section>

      {/* Steps */}
      <section className="rounded-xl border bg-card p-5 mb-6">
        <h2 className="font-semibold text-sm text-muted-foreground mb-4 flex items-center gap-1.5">
          📋 الخطوات
        </h2>

        <div className="space-y-2">
          {steps.map((step, index) => (
            <div key={step.id}>
              <StepCard
                step={step}
                index={index}
                onUpdate={(config) => updateStep(index, config)}
                onRemove={() => removeStep(index)}
              />
              <StepInserter onAdd={(type) => addStep(index, type)} />
            </div>
          ))}
        </div>
      </section>
    </>
  )
}

function TriggerHelp() {
  return (
    <FieldHelp
      label=""
      tip="المُشغّل هو الحدث الذي يُطلق الأتمتة لأول مرة لعميل معين. المُشغّلات المتاحة:
• عميل جديد سجّل بطاقة → فور التسجيل
• عيد الميلاد → يومياً يفحص العملاء الذين اليوم عيد ميلادهم
• عميل غير نشط → يفحص العملاء الذين لم يزوروا منذ X يوم"
    />
  )
}

/* ─── Trigger picker ──────────────────────────────────────────── */

function TriggerPicker({
  value,
  onChange,
}: {
  value: AutomationTrigger
  onChange: (v: AutomationTrigger) => void
}) {
  const triggers: { key: AutomationTrigger; icon: typeof UserPlus; title: string; desc: string; color: string }[] = [
    {
      key: 'card_issued',
      icon: UserPlus,
      title: 'عميل جديد',
      desc: 'ينطلق فور تسجيل عميل جديد لبطاقتك',
      color: 'text-blue-500',
    },
    {
      key: 'birthday',
      icon: Cake,
      title: 'عيد ميلاد',
      desc: 'ينطلق في يوم عيد ميلاد العميل',
      color: 'text-pink-500',
    },
    {
      key: 'inactive',
      icon: Clock,
      title: 'غير نشط',
      desc: 'ينطلق عندما يمضي العميل فترة بدون زيارة',
      color: 'text-amber-500',
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {triggers.map((t) => {
        const Icon = t.icon
        const active = value === t.key
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => onChange(t.key)}
            className={cn(
              'text-start p-4 rounded-lg border transition',
              active
                ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                : 'border-border hover:border-ring',
            )}
          >
            <Icon className={cn('w-5 h-5 mb-2', t.color)} />
            <div className="font-semibold text-sm">{t.title}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{t.desc}</div>
          </button>
        )
      })}
    </div>
  )
}

/* ─── Step card (with inline editor) ─────────────────────────── */

const STEP_META: Record<AutomationStepType, { icon: typeof Send; title: string; color: string }> = {
  send_sms: { icon: Send, title: 'إرسال SMS', color: 'text-emerald-500' },
  send_email: { icon: Mail, title: 'إرسال بريد', color: 'text-blue-500' },
  send_push: { icon: Bell, title: 'إرسال تنبيه', color: 'text-amber-500' },
  add_stamps: { icon: StampIcon, title: 'منح أختام', color: 'text-amber-500' },
  wait: { icon: Clock, title: 'انتظار', color: 'text-purple-500' },
  condition: { icon: GitBranch, title: 'شرط', color: 'text-pink-500' },
  stop: { icon: StopCircle, title: 'إيقاف', color: 'text-red-500' },
}

function StepCard({
  step,
  index,
  onUpdate,
  onRemove,
}: {
  step: AutomationStep
  index: number
  onUpdate: (config: Record<string, unknown>) => void
  onRemove: () => void
}) {
  const meta = STEP_META[step.type]
  const Icon = meta.icon

  return (
    <div className="rounded-xl border border-border bg-background">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
            {index + 1}
          </div>
          <Icon className={cn('w-4 h-4', meta.color)} />
          <span className="font-medium text-sm">{meta.title}</span>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="text-muted-foreground hover:text-destructive transition"
          aria-label="حذف الخطوة"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      <div className="p-4 space-y-3">
        <StepConfigEditor step={step} onUpdate={onUpdate} />
      </div>
    </div>
  )
}

function StepConfigEditor({
  step,
  onUpdate,
}: {
  step: AutomationStep
  onUpdate: (config: Record<string, unknown>) => void
}) {
  const c = step.config

  switch (step.type) {
    case 'send_sms':
      return (
        <FieldHelp
          label="نص الرسالة"
          tip="نص الـ SMS الذي سيُرسَل تلقائياً. يمكنك استخدام المتغيرات مثل {{customer.first_name}} و {{brand.name}} لتخصيص كل رسالة لكل عميل تلقائياً."
          htmlFor={`sms-${step.id}`}
          required
        >
          <Textarea
            id={`sms-${step.id}`}
            value={(c.body as string) ?? ''}
            onChange={(e) => onUpdate({ ...c, body: e.target.value })}
            rows={3}
            placeholder="مرحبا {{customer.first_name}}..."
          />
          <p className="text-[10px] text-muted-foreground mt-1">
            المتغيرات المتاحة:{' '}
            <code className="font-mono">{'{{customer.first_name}}'}</code>،{' '}
            <code className="font-mono">{'{{customer.full_name}}'}</code>،{' '}
            <code className="font-mono">{'{{brand.name}}'}</code>
          </p>
        </FieldHelp>
      )
    case 'send_email':
      return (
        <>
          <FieldHelp
            label="العنوان"
            tip="عنوان البريد الإلكتروني الذي سيراه العميل في صندوقه. يدعم نفس المتغيرات."
            htmlFor={`email-sub-${step.id}`}
            required
          >
            <Input
              id={`email-sub-${step.id}`}
              value={(c.subject as string) ?? ''}
              onChange={(e) => onUpdate({ ...c, subject: e.target.value })}
              placeholder="أهلاً بك في {{brand.name}}"
            />
          </FieldHelp>
          <FieldHelp
            label="محتوى HTML"
            tip="محتوى البريد بصيغة HTML. يمكنك إضافة ألوان وصور وروابط. نفس المتغيرات مدعومة هنا أيضاً."
            htmlFor={`email-body-${step.id}`}
            required
          >
            <Textarea
              id={`email-body-${step.id}`}
              value={(c.body as string) ?? ''}
              onChange={(e) => onUpdate({ ...c, body: e.target.value })}
              rows={6}
              dir="ltr"
              className="font-mono text-xs"
            />
          </FieldHelp>
        </>
      )
    case 'send_push':
      return (
        <>
          <FieldHelp
            label="عنوان التنبيه"
            tip="العنوان الذي سيظهر في التنبيه على جهاز العميل. اجعله قصيراً — iOS يقتطع ما بعد 40 حرفاً."
            htmlFor={`push-title-${step.id}`}
            required
          >
            <Input
              id={`push-title-${step.id}`}
              value={(c.title as string) ?? ''}
              onChange={(e) => onUpdate({ ...c, title: e.target.value })}
              placeholder="عرض جديد من {{brand.name}}"
            />
          </FieldHelp>
          <FieldHelp
            label="نص التنبيه"
            tip="النص الرئيسي الذي يظهر تحت العنوان. ابقه تحت 120 حرفاً لضمان عدم الاقتطاع على أغلب الأجهزة."
            htmlFor={`push-body-${step.id}`}
            required
          >
            <Textarea
              id={`push-body-${step.id}`}
              value={(c.body as string) ?? ''}
              onChange={(e) => onUpdate({ ...c, body: e.target.value })}
              rows={3}
              placeholder="مرحباً {{customer.first_name}}، بطاقتك جاهزة."
            />
          </FieldHelp>
          <FieldHelp
            label="رابط النقر (اختياري)"
            tip="الرابط الذي يفتح عندما يضغط العميل على التنبيه. اتركه فارغاً لفتح صفحة البراند الخاصة بالتاجر تلقائياً."
            htmlFor={`push-url-${step.id}`}
          >
            <Input
              id={`push-url-${step.id}`}
              dir="ltr"
              value={(c.url as string) ?? ''}
              onChange={(e) => onUpdate({ ...c, url: e.target.value })}
              placeholder="https://... (اختياري)"
              className="font-mono text-xs"
            />
          </FieldHelp>
          <p className="text-[10px] text-muted-foreground">
            يصل التنبيه فقط للعملاء الذين فعّلوا التنبيهات على صفحة بطاقتهم.
          </p>
        </>
      )
    case 'add_stamps':
      return (
        <FieldHelp
          label="عدد الأختام"
          tip="عدد الأختام التي ستُمنح للعميل تلقائياً على آخر بطاقة صادرة له. تُسجَّل باسم «automation» في سجل الأختام."
          htmlFor={`stamps-${step.id}`}
          required
        >
          <Input
            id={`stamps-${step.id}`}
            type="number"
            min={1}
            max={50}
            value={(c.count as number) ?? 1}
            onChange={(e) => onUpdate({ ...c, count: Number(e.target.value) })}
            className="max-w-[120px]"
          />
        </FieldHelp>
      )
    case 'wait':
      return (
        <div className="flex items-end gap-3">
          <FieldHelp
            label="المدة"
            tip="كم من الوقت يجب أن تنتظر الأتمتة قبل تنفيذ الخطوة التالية. خلال فترة الانتظار، الأتمتة متوقفة ولا تستهلك أي موارد."
            htmlFor={`wait-dur-${step.id}`}
            required
          >
            <Input
              id={`wait-dur-${step.id}`}
              type="number"
              min={1}
              value={(c.duration as number) ?? 1}
              onChange={(e) => onUpdate({ ...c, duration: Number(e.target.value) })}
              className="w-24"
            />
          </FieldHelp>
          <FieldHelp
            label="الوحدة"
            tip="وحدة الوقت: دقائق للاختبار السريع، ساعات للرسائل القصيرة المدى، أيام للحملات طويلة المدى."
            htmlFor={`wait-unit-${step.id}`}
          >
            <select
              id={`wait-unit-${step.id}`}
              value={(c.unit as string) ?? 'hours'}
              onChange={(e) => onUpdate({ ...c, unit: e.target.value })}
              className="h-9 rounded-md border border-border bg-background px-2 text-sm"
            >
              <option value="minutes">دقائق</option>
              <option value="hours">ساعات</option>
              <option value="days">أيام</option>
            </select>
          </FieldHelp>
        </div>
      )
    case 'condition':
      return (
        <>
          <FieldHelp
            label="الحقل"
            tip="الحقل الذي سيُقارَن. stamps_count = إجمالي أختام العميل، days_since_signup = عدد الأيام منذ تسجيله."
            htmlFor={`cond-field-${step.id}`}
          >
            <select
              id={`cond-field-${step.id}`}
              value={(c.field as string) ?? 'stamps_count'}
              onChange={(e) => onUpdate({ ...c, field: e.target.value })}
              className="h-9 rounded-md border border-border bg-background px-2 text-sm w-full"
            >
              <option value="stamps_count">عدد الأختام</option>
              <option value="days_since_signup">الأيام منذ التسجيل</option>
            </select>
          </FieldHelp>
          <div className="flex items-end gap-3">
            <FieldHelp
              label="العامل"
              tip="طريقة المقارنة. >= أكبر أو يساوي، <= أصغر أو يساوي، == يساوي."
              htmlFor={`cond-op-${step.id}`}
            >
              <select
                id={`cond-op-${step.id}`}
                value={(c.operator as string) ?? '>='}
                onChange={(e) => onUpdate({ ...c, operator: e.target.value })}
                className="h-9 rounded-md border border-border bg-background px-2 text-sm"
              >
                <option value=">=">{'>='}</option>
                <option value=">">{'>'}</option>
                <option value="<=">{'<='}</option>
                <option value="<">{'<'}</option>
                <option value="==">=</option>
              </select>
            </FieldHelp>
            <FieldHelp
              label="القيمة"
              tip="إذا لم يتحقق الشرط، تُتخطّى الخطوة التالية فقط (ليست الأتمتة كاملة)."
              htmlFor={`cond-val-${step.id}`}
            >
              <Input
                id={`cond-val-${step.id}`}
                type="number"
                value={(c.value as number) ?? 0}
                onChange={(e) => onUpdate({ ...c, value: Number(e.target.value) })}
                className="w-24"
              />
            </FieldHelp>
          </div>
        </>
      )
    case 'stop':
      return (
        <p className="text-xs text-muted-foreground">
          هذه الخطوة تُنهي الأتمتة فوراً. مفيدة بعد شرط لمنع تنفيذ باقي الخطوات.
        </p>
      )
    default:
      return null
  }
}

/* ─── Step inserter ────────────────────────────────────────── */

function StepInserter({ onAdd }: { onAdd: (type: AutomationStepType) => void }) {
  const [open, setOpen] = useState(false)

  const options: { type: AutomationStepType; title: string; desc: string }[] = [
    { type: 'send_sms', title: 'إرسال SMS', desc: 'رسالة نصية إلى جوّال العميل' },
    { type: 'send_email', title: 'إرسال بريد', desc: 'إيميل HTML كامل' },
    { type: 'send_push', title: 'إرسال تنبيه', desc: 'إشعار push للعملاء المشتركين' },
    { type: 'add_stamps', title: 'منح أختام', desc: 'إضافة أختام تلقائياً' },
    { type: 'wait', title: 'انتظار', desc: 'تأخير قبل الخطوة التالية' },
    { type: 'condition', title: 'شرط', desc: 'تخطّي الخطوة التالية إذا لم يتحقق' },
    { type: 'stop', title: 'إيقاف', desc: 'إنهاء الأتمتة عند هذه النقطة' },
  ]

  return (
    <div className="py-2 relative flex justify-center">
      {open ? (
        <div className="w-full rounded-xl border border-primary/30 bg-primary/5 p-3">
          <div className="text-xs text-muted-foreground mb-2 flex items-center justify-between">
            اختر نوع الخطوة:
            <button type="button" onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
              إلغاء
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {options.map((opt) => {
              const meta = STEP_META[opt.type]
              const Icon = meta.icon
              return (
                <button
                  key={opt.type}
                  type="button"
                  onClick={() => {
                    onAdd(opt.type)
                    setOpen(false)
                  }}
                  className="text-start p-2 rounded-md border border-border bg-background hover:border-primary hover:bg-primary/5 transition"
                >
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Icon className={cn('w-3.5 h-3.5', meta.color)} />
                    <span className="text-xs font-semibold">{opt.title}</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground">{opt.desc}</div>
                </button>
              )
            })}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary border border-dashed border-border hover:border-primary rounded-full px-3 py-1 transition"
        >
          <Plus className="w-3 h-3" />
          إضافة خطوة
        </button>
      )}
    </div>
  )
}

/* ─── Status pill ──────────────────────────────────────────── */

function StatusPill({ status }: { status: AutomationStatus }) {
  const config = {
    draft: { label: 'مسودة', className: 'bg-muted text-muted-foreground border', Icon: FileText },
    active: { label: 'نشطة', className: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30 border', Icon: PlayCircle },
    paused: { label: 'موقوفة', className: 'bg-amber-500/15 text-amber-700 border-amber-500/30 border', Icon: Pause },
  } as const
  const { label, className, Icon } = config[status]
  return (
    <span className={cn('inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full', className)}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  )
}

/* ─── helpers ──────────────────────────────────────────────── */

function genId() {
  return 's' + Math.random().toString(36).slice(2, 9)
}

function defaultConfigFor(type: AutomationStepType): Record<string, unknown> {
  switch (type) {
    case 'send_sms':
      return { body: 'مرحبا {{customer.first_name}}!' }
    case 'send_email':
      return { subject: 'أهلاً بك', body: '<p>Hello {{customer.first_name}}</p>' }
    case 'send_push':
      return {
        title: 'مرحباً {{customer.first_name}}!',
        body: 'عرض جديد من {{brand.name}}',
        url: '',
      }
    case 'add_stamps':
      return { count: 1 }
    case 'wait':
      return { duration: 1, unit: 'days' }
    case 'condition':
      return { field: 'stamps_count', operator: '>=', value: 5 }
    case 'stop':
      return {}
    default:
      return {}
  }
}

function extractError(err: unknown): string | undefined {
  if (err instanceof AxiosError) {
    const data = err.response?.data as
      | { message?: string; errors?: Record<string, string[]> }
      | undefined
    const firstErr = data?.errors ? Object.values(data.errors)[0]?.[0] : undefined
    return firstErr ?? data?.message
  }
  return undefined
}
