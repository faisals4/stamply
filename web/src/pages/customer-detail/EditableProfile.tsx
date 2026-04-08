import { useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import { Check, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { EditButton } from '@/components/ui/edit-button'
import { updateCustomer } from '@/lib/phase1Api'
import type { CustomerDetail } from '@/types/customer'

interface Props {
  customer: CustomerDetail
}

/**
 * Compact profile block on the customer detail page. Read-only by default,
 * switches to an inline edit form when the pencil button is clicked.
 */
export function EditableProfile({ customer }: Props) {
  const qc = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [firstName, setFirstName] = useState(customer.first_name ?? '')
  const [lastName, setLastName] = useState(customer.last_name ?? '')
  const [email, setEmail] = useState(customer.email ?? '')
  const [phone, setPhone] = useState(customer.phone)
  const [birthdate, setBirthdate] = useState(customer.birthdate ?? '')

  const mutation = useMutation({
    mutationFn: () =>
      updateCustomer(customer.id, {
        first_name: firstName.trim() || null,
        last_name: lastName.trim() || null,
        email: email.trim() || null,
        phone: phone.trim(),
        birthdate: birthdate || null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customer', String(customer.id)] })
      qc.invalidateQueries({ queryKey: ['customers'] })
      setEditing(false)
      setError(null)
    },
    onError: (err: AxiosError<{ message?: string }>) => {
      setError(err.response?.data?.message ?? 'تعذر حفظ التعديلات')
    },
  })

  const reset = () => {
    setFirstName(customer.first_name ?? '')
    setLastName(customer.last_name ?? '')
    setEmail(customer.email ?? '')
    setPhone(customer.phone)
    setBirthdate(customer.birthdate ?? '')
    setError(null)
    setEditing(false)
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    mutation.mutate()
  }

  return (
    <div className="rounded-xl border bg-card p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold">المعلومات الشخصية</h2>
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
          <Field label="الاسم الأول" value={customer.first_name} />
          <Field label="الاسم الأخير" value={customer.last_name} />
          <Field label="رقم الجوال" value={customer.phone} mono />
          <Field label="البريد الإلكتروني" value={customer.email} mono />
          <Field label="تاريخ الميلاد" value={customer.birthdate} mono />
          <Field label="مصدر التسجيل" value={customer.source_utm ?? 'مباشر'} />
        </dl>
      ) : (
        // Edit form
        <form onSubmit={onSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="first_name">الاسم الأول</Label>
            <Input
              id="first_name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="last_name">الاسم الأخير</Label>
            <Input
              id="last_name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">رقم الجوال *</Label>
            <Input
              id="phone"
              required
              dir="ltr"
              className="font-mono"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">البريد الإلكتروني</Label>
            <Input
              id="email"
              type="email"
              dir="ltr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="birthdate">تاريخ الميلاد</Label>
            <Input
              id="birthdate"
              type="date"
              value={birthdate}
              onChange={(e) => setBirthdate(e.target.value)}
            />
          </div>

          {error && (
            <div className="sm:col-span-2 text-sm text-destructive">{error}</div>
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
}: {
  label: string
  value?: string | null
  mono?: boolean
}) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground mb-0.5">{label}</dt>
      <dd className={mono ? 'font-mono text-sm' : 'text-sm'}>{value || '—'}</dd>
    </div>
  )
}
