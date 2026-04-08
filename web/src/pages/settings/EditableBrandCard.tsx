import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import {
  Building2,
  Check,
  X,
  Loader2,
  ImagePlus,
  Trash2,
  Upload,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { EditButton } from '@/components/ui/edit-button'
import { getTenant, updateTenant } from '@/lib/api/tenant'

const MAX_LOGO_BYTES = 1.5 * 1024 * 1024 // 1.5 MB after base64

/**
 * Editable "Business Info" card shown on /admin/settings.
 * Drives the tenant name, subdomain, description, and logo — all of which
 * are surfaced on the public customer-facing pages and transactional
 * messages.
 */
export function EditableBrandCard() {
  const qc = useQueryClient()
  const { data: tenant, isLoading } = useQuery({
    queryKey: ['tenant'],
    queryFn: getTenant,
  })

  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')
  const [subdomain, setSubdomain] = useState('')
  const [description, setDescription] = useState('')
  const [logo, setLogo] = useState<string | null>(null)
  const [logoTouched, setLogoTouched] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (tenant) {
      setName(tenant.name)
      setSubdomain(tenant.subdomain)
      setDescription(tenant.description ?? '')
      setLogo(tenant.logo ?? null)
      setLogoTouched(false)
    }
  }, [tenant])

  const mutation = useMutation({
    mutationFn: () =>
      updateTenant({
        name: name.trim(),
        subdomain: subdomain.trim(),
        description: description.trim() || null,
        // Only send logo if the user actually changed it, so we don't re-upload
        // the same base64 string every save.
        ...(logoTouched ? { logo } : {}),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tenant'] })
      setEditing(false)
      setError(null)
    },
    onError: (err: AxiosError<{ message?: string; errors?: Record<string, string[]> }>) => {
      const msg =
        err.response?.data?.message ??
        err.response?.data?.errors?.subdomain?.[0] ??
        'تعذر حفظ التعديلات'
      setError(msg)
    },
  })

  const reset = () => {
    if (tenant) {
      setName(tenant.name)
      setSubdomain(tenant.subdomain)
      setDescription(tenant.description ?? '')
      setLogo(tenant.logo ?? null)
      setLogoTouched(false)
    }
    setError(null)
    setEditing(false)
  }

  const handleLogoPick = (file: File) => {
    setError(null)
    if (file.size > MAX_LOGO_BYTES) {
      setError('حجم الصورة أكبر من 1.5 ميجابايت')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setLogo(String(reader.result))
      setLogoTouched(true)
    }
    reader.onerror = () => setError('تعذر قراءة الملف')
    reader.readAsDataURL(file)
  }

  const removeLogo = () => {
    setLogo(null)
    setLogoTouched(true)
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    mutation.mutate()
  }

  if (isLoading || !tenant) {
    return (
      <section className="rounded-xl border bg-card p-6">
        <div className="text-sm text-muted-foreground">جارٍ التحميل...</div>
      </section>
    )
  }

  return (
    <section className="rounded-xl border bg-card p-6">
      <header className="flex items-start justify-between gap-3 mb-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <h2 className="font-semibold">معلومات النشاط التجاري</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              تظهر هذه المعلومات للعملاء في: صفحة تسجيل البطاقة، صفحة عرض
              البطاقة، ورسائل البريد الإلكتروني والـ SMS (عبر المتغير
              <code className="bg-muted rounded px-1 mx-1 font-mono text-[10px]">
                {`{{brand.name}}`}
              </code>
              ). والشعار يظهر في رأس صفحات العملاء العامة.
            </p>
          </div>
        </div>
        {!editing ? (
          <EditButton
            onClick={() => setEditing(true)}
            label="تعديل معلومات النشاط"
          />
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={reset}
            disabled={mutation.isPending}
          >
            <X className="w-3.5 h-3.5 me-1.5" />
            إلغاء
          </Button>
        )}
      </header>

      {!editing ? (
        /* Read-only view */
        <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-5 items-start">
          {/* Logo preview */}
          <div className="w-24 h-24 rounded-xl border bg-muted flex items-center justify-center overflow-hidden shrink-0">
            {tenant.logo ? (
              <img
                src={tenant.logo}
                alt={tenant.name}
                className="max-w-full max-h-full object-contain"
              />
            ) : (
              <Building2 className="w-10 h-10 text-muted-foreground/40" />
            )}
          </div>

          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm min-w-0">
            <Field label="اسم النشاط" value={tenant.name} />
            <Field label="المُعرِّف (subdomain)" value={tenant.subdomain} mono />
            <Field label="الخطة" value={tenant.plan} />
            <Field label="الحالة" value={tenant.is_active ? 'نشط' : 'معطّل'} />
            {tenant.description && (
              <div className="sm:col-span-2">
                <dt className="text-xs text-muted-foreground mb-0.5">الوصف</dt>
                <dd className="text-sm">{tenant.description}</dd>
              </div>
            )}
          </dl>
        </div>
      ) : (
        /* Edit form */
        <form onSubmit={onSubmit} className="space-y-4">
          {/* Logo uploader */}
          <div>
            <Label>الشعار</Label>
            <div className="mt-2 flex items-start gap-4">
              <div className="w-24 h-24 rounded-xl border bg-muted flex items-center justify-center overflow-hidden shrink-0">
                {logo ? (
                  <img
                    src={logo}
                    alt="preview"
                    className="max-w-full max-h-full object-contain"
                  />
                ) : (
                  <Building2 className="w-10 h-10 text-muted-foreground/40" />
                )}
              </div>
              <div className="flex-1 space-y-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) handleLogoPick(f)
                    e.target.value = ''
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileRef.current?.click()}
                >
                  {logo ? (
                    <>
                      <ImagePlus className="w-3.5 h-3.5 me-1.5" />
                      استبدال الشعار
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5 me-1.5" />
                      رفع شعار
                    </>
                  )}
                </Button>
                {logo && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={removeLogo}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-3.5 h-3.5 me-1.5" />
                    إزالة
                  </Button>
                )}
                <p className="text-[11px] text-muted-foreground">
                  PNG / JPG / SVG / WebP — حد أقصى 1.5 ميجابايت
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="brand-name">اسم النشاط *</Label>
              <Input
                id="brand-name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="brand-subdomain">المُعرِّف *</Label>
              <Input
                id="brand-subdomain"
                required
                value={subdomain}
                onChange={(e) => setSubdomain(e.target.value.toLowerCase())}
                pattern="[a-z0-9-]+"
                dir="ltr"
                className="font-mono"
              />
              <p className="text-[11px] text-muted-foreground">
                حروف إنجليزية صغيرة وأرقام فقط، لاستخدامها في الروابط
              </p>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="brand-desc">الوصف (اختياري)</Label>
              <Textarea
                id="brand-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                maxLength={280}
                placeholder="نبذة مختصرة عن نشاطك التجاري"
              />
              <p className="text-[11px] text-muted-foreground">
                {description.length}/280 حرف
              </p>
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end border-t pt-4">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin me-1.5" />
                  جارٍ الحفظ...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 me-1.5" />
                  حفظ التعديلات
                </>
              )}
            </Button>
          </div>
        </form>
      )}
    </section>
  )
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground mb-0.5">{label}</dt>
      <dd className={mono ? 'font-mono text-sm' : 'text-sm font-medium'}>{value}</dd>
    </div>
  )
}
