import { useState, type FormEvent, type ReactNode } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import { Check, X, Loader2, Lock, BadgeCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { EditButton } from '@/components/ui/edit-button'
import { updateCustomer } from '@/lib/api/misc'
import type { CustomerDetail, LockableField } from '@/types/customer'

interface Props {
  customer: CustomerDetail
}

/**
 * Compact profile block on the customer detail page. Read-only by default,
 * switches to an inline edit form when the pencil button is clicked.
 *
 * Locked-field handling:
 * Since the central customer profile refactor, every field the end
 * customer has touched through the mobile app gets added to
 * `locked_fields` on their profile. Merchants can't override these —
 * the backend returns HTTP 423 with the list of locked fields when
 * they try. This component:
 *
 *   1. Renders locked inputs as disabled with a lock icon + tooltip.
 *   2. Shows an inline 423 error above the form listing every field
 *      the save attempt hit a lock on, in case the lock state
 *      changed between the last fetch and the save.
 *
 * Phone is a special case: it is always read-only for verified
 * profiles and handled the same way.
 */
export function EditableProfile({ customer }: Props) {
  const qc = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [serverLockedFields, setServerLockedFields] = useState<LockableField[] | null>(null)

  const [firstName, setFirstName] = useState(customer.first_name ?? '')
  const [lastName, setLastName] = useState(customer.last_name ?? '')
  const [email, setEmail] = useState(customer.email ?? '')
  const [phone, setPhone] = useState(customer.phone)
  const [birthdate, setBirthdate] = useState(customer.birthdate ?? '')

  const lockedFields = customer.locked_fields ?? []
  const isLocked = (field: LockableField) => lockedFields.includes(field)
  const phoneLocked = !!customer.phone_verified_at

  const mutation = useMutation({
    mutationFn: () => {
      // Skip fields the profile has locked — the backend will 423
      // anyway, and this avoids sending values the merchant never
      // intended to change just because they were pre-filled.
      const patch: Record<string, string | null> = {}
      if (!isLocked('first_name')) patch.first_name = firstName.trim() || null
      if (!isLocked('last_name')) patch.last_name = lastName.trim() || null
      if (!isLocked('email')) patch.email = email.trim() || null
      if (!isLocked('birthdate')) patch.birthdate = birthdate || null
      if (!phoneLocked) patch.phone = phone.trim()
      return updateCustomer(customer.id, patch)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customer', String(customer.id)] })
      qc.invalidateQueries({ queryKey: ['customers'] })
      setEditing(false)
      setError(null)
      setServerLockedFields(null)
    },
    onError: (err: AxiosError<{ message?: string; error?: string; locked?: LockableField[] }>) => {
      const body = err.response?.data
      if (err.response?.status === 423) {
        setServerLockedFields(body?.locked ?? [])
        setError(
          body?.message ??
            'بعض الحقول محمية من قبل العميل ولا يمكن تعديلها من لوحة التاجر.',
        )
        qc.invalidateQueries({ queryKey: ['customer', String(customer.id)] })
        return
      }
      setError(body?.message ?? 'تعذر حفظ التعديلات')
    },
  })

  const reset = () => {
    setFirstName(customer.first_name ?? '')
    setLastName(customer.last_name ?? '')
    setEmail(customer.email ?? '')
    setPhone(customer.phone)
    setBirthdate(customer.birthdate ?? '')
    setError(null)
    setServerLockedFields(null)
    setEditing(false)
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    mutation.mutate()
  }

  return (
    <div className="rounded-xl border bg-card p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold flex items-center gap-2">
          المعلومات الشخصية
          {customer.phone_verified_at ? (
            <span
              className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-2 py-0.5 text-xs font-medium text-brand"
              title="العميل وثّق رقم جواله وأصبح المتحكم في بياناته الشخصية"
            >
              <BadgeCheck className="w-3 h-3" />
              موثّق
            </span>
          ) : null}
        </h2>
        {!editing ? (
          <EditButton
            onClick={() => setEditing(true)}
            label="تعديل المعلومات الشخصية"
          />
        ) : (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={reset} disabled={mutation.isPending}>
              <X className="w-3.5 h-3.5 me-1.5" />
              إلغاء
            </Button>
          </div>
        )}
      </div>

      {!editing ? (
        // Read-only view
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <Field label="الاسم الأول" value={customer.first_name} locked={isLocked('first_name')} />
          <Field label="الاسم الأخير" value={customer.last_name} locked={isLocked('last_name')} />
          <Field label="رقم الجوال" value={customer.phone} mono locked={phoneLocked} />
          <Field label="البريد الإلكتروني" value={customer.email} mono locked={isLocked('email')} />
          <Field label="تاريخ الميلاد" value={customer.birthdate} mono locked={isLocked('birthdate')} />
          <Field
            label="الجنس"
            value={customer.gender === 'male' ? 'ذكر' : customer.gender === 'female' ? 'أنثى' : null}
            locked={isLocked('gender')}
          />
          <Field label="مصدر التسجيل" value={customer.source_utm ?? 'مباشر'} />
        </dl>
      ) : (
        // Edit form
        <form onSubmit={onSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FieldGroup label="الاسم الأول" locked={isLocked('first_name')}>
            <Input
              id="first_name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              disabled={isLocked('first_name')}
            />
          </FieldGroup>

          <FieldGroup label="الاسم الأخير" locked={isLocked('last_name')}>
            <Input
              id="last_name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              disabled={isLocked('last_name')}
            />
          </FieldGroup>

          <FieldGroup label="رقم الجوال *" locked={phoneLocked}>
            <Input
              id="phone"
              required
              dir="ltr"
              className="font-mono"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={phoneLocked}
            />
          </FieldGroup>

          <FieldGroup label="البريد الإلكتروني" locked={isLocked('email')}>
            <Input
              id="email"
              type="email"
              dir="ltr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLocked('email')}
            />
          </FieldGroup>

          <FieldGroup label="تاريخ الميلاد" locked={isLocked('birthdate')}>
            <Input
              id="birthdate"
              type="date"
              value={birthdate}
              onChange={(e) => setBirthdate(e.target.value)}
              disabled={isLocked('birthdate')}
            />
          </FieldGroup>

          {error && (
            <div className="sm:col-span-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              <div className="flex items-start gap-2">
                <Lock className="w-4 h-4 mt-0.5 shrink-0" />
                <div>
                  <div>{error}</div>
                  {serverLockedFields && serverLockedFields.length > 0 ? (
                    <div className="mt-1 text-xs text-amber-700">
                      الحقول المقفولة: {serverLockedFields.map(fieldLabelAr).join('، ')}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          )}

          <div className="sm:col-span-2 flex justify-end">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin me-1.5" />
                  جارٍ الحفظ...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 me-1.5" />
                  حفظ
                </>
              )}
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}

function Field({
  label,
  value,
  mono,
  locked,
}: {
  label: string
  value?: string | null
  mono?: boolean
  locked?: boolean
}) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1">
        {label}
        {locked ? (
          <Lock
            className="w-3 h-3 text-muted-foreground"
            aria-label="محمي من قبل العميل"
          />
        ) : null}
      </dt>
      <dd className={mono ? 'font-mono text-sm' : 'text-sm'}>{value || '—'}</dd>
    </div>
  )
}

function FieldGroup({
  label,
  locked,
  children,
}: {
  label: string
  locked?: boolean
  children: ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-1">
        {label}
        {locked ? (
          <Lock
            className="w-3 h-3 text-muted-foreground"
            aria-label="محمي من قبل العميل"
          />
        ) : null}
      </Label>
      {children}
      {locked ? (
        <p className="text-xs text-muted-foreground">
          هذا الحقل مقفل من قبل العميل ولا يمكن تعديله.
        </p>
      ) : null}
    </div>
  )
}

function fieldLabelAr(field: LockableField): string {
  switch (field) {
    case 'first_name':
      return 'الاسم الأول'
    case 'last_name':
      return 'الاسم الأخير'
    case 'email':
      return 'البريد الإلكتروني'
    case 'birthdate':
      return 'تاريخ الميلاد'
    case 'gender':
      return 'الجنس'
  }
}
