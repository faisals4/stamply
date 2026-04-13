import { useRef, useState } from 'react'
import { Link } from 'wouter'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Plus,
  ArrowRight,
  Image as ImageIcon,
  X,
  Upload,
  Loader2,
} from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { EditButton } from '@/components/ui/edit-button'
import { DeleteButton } from '@/components/ui/delete-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  listBanners,
  createBanner,
  updateBanner,
  deleteBanner,
  toggleBanner,
  type BannerItem,
} from '@/lib/api/op/banners'

export default function OpBannerManagementPage() {
  const qc = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingBanner, setEditingBanner] = useState<BannerItem | null>(null)
  const [title, setTitle] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isActive, setIsActive] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: banners = [], isLoading } = useQuery({
    queryKey: ['op-banners'],
    queryFn: listBanners,
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      const form = new FormData()
      form.append('title', title)
      form.append('is_active', isActive ? '1' : '0')
      if (imageFile) form.append('image', imageFile)

      if (editingBanner) {
        return updateBanner(editingBanner.id, form)
      }
      return createBanner(form)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['op-banners'] })
      closeDialog()
    },
    onError: (err: unknown) => {
      const axiosErr = err as { response?: { data?: { message?: string } } }
      alert(axiosErr.response?.data?.message ?? 'تعذر الحفظ')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteBanner,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['op-banners'] }),
  })

  const toggleMutation = useMutation({
    mutationFn: toggleBanner,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['op-banners'] }),
  })

  const openAdd = () => {
    setEditingBanner(null)
    setTitle('')
    setImageFile(null)
    setImagePreview(null)
    setIsActive(true)
    setDialogOpen(true)
  }

  const openEdit = (banner: BannerItem) => {
    setEditingBanner(banner)
    setTitle(banner.title)
    setImageFile(null)
    setImagePreview(banner.image_url)
    setIsActive(banner.is_active)
    setDialogOpen(true)
  }

  const closeDialog = () => {
    setDialogOpen(false)
    setEditingBanner(null)
    setImageFile(null)
    setImagePreview(null)
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    const reader = new FileReader()
    reader.onload = () => setImagePreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  const canSave = title.trim() && (imageFile || editingBanner?.image_url)

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link href="/op/app-settings" className="hover:text-foreground transition">
          إعدادات التطبيق
        </Link>
        <ArrowRight className="w-3 h-3 rtl:rotate-180" />
        <span className="text-foreground">إدارة البنرات</span>
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <PageHeader
          title="إدارة البنرات"
          description="أضف وعدّل وتحكم في البنرات الإعلانية لتطبيق ستامبلي"
        />
        <Button onClick={openAdd} className="gap-2 shrink-0">
          <Plus className="w-4 h-4" />
          إضافة بانر
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="hidden md:grid grid-cols-[80px_1fr_100px_120px] gap-4 px-4 py-3 border-b bg-muted/40 text-xs font-medium text-muted-foreground">
          <div>الصورة</div>
          <div>العنوان</div>
          <div className="text-center">الحالة</div>
          <div className="text-center">إجراءات</div>
        </div>

        {isLoading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
          </div>
        ) : banners.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            <ImageIcon className="w-10 h-10 mx-auto mb-3 opacity-30" />
            لا توجد بنرات بعد. اضغط على "إضافة بانر" للبدء.
          </div>
        ) : (
          banners.map((banner) => (
            <div
              key={banner.id}
              className="grid grid-cols-1 md:grid-cols-[80px_1fr_100px_120px] gap-3 md:gap-4 px-4 py-3 border-b last:border-b-0 items-center"
            >
              <div className="w-16 h-10 md:w-full md:h-12 rounded-md overflow-hidden bg-muted shrink-0">
                {banner.image_url ? (
                  <img src={banner.image_url} alt={banner.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="w-4 h-4 text-muted-foreground" />
                  </div>
                )}
              </div>

              <div className="text-sm font-medium">{banner.title}</div>

              <div className="flex items-center gap-2 md:justify-center">
                <Switch
                  checked={banner.is_active}
                  onCheckedChange={() => toggleMutation.mutate(banner.id)}
                />
                <span className="text-xs md:hidden">
                  {banner.is_active ? (
                    <span className="text-emerald-600">نشط</span>
                  ) : (
                    <span className="text-muted-foreground">متوقف</span>
                  )}
                </span>
              </div>

              <div className="flex items-center gap-1 md:justify-center">
                <EditButton onClick={() => openEdit(banner)} label="تعديل البانر" />
                <DeleteButton
                  onConfirm={() => deleteMutation.mutateAsync(banner.id)}
                  loading={deleteMutation.isPending && deleteMutation.variables === banner.id}
                  label="حذف البانر"
                  title="حذف البانر"
                  description={<>سيتم حذف البانر &quot;<strong>{banner.title}</strong>&quot; نهائياً.</>}
                  confirmLabel="حذف البانر"
                />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Dialog */}
      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center py-8">
          <div className="absolute inset-0 bg-black/50" onClick={closeDialog} />
          <div className="relative bg-background rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[calc(100vh-4rem)] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-background z-10">
              <h2 className="text-base font-semibold">
                {editingBanner ? 'تعديل البانر' : 'إضافة بانر جديد'}
              </h2>
              <button onClick={closeDialog} className="text-muted-foreground hover:text-foreground transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Image upload */}
              <div className="space-y-1.5">
                <Label>الصورة</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageSelect}
                />
                {imagePreview ? (
                  <div className="relative w-full h-40 rounded-lg overflow-hidden bg-muted">
                    <img src={imagePreview} alt="معاينة" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition">
                      <Button size="sm" variant="secondary" onClick={() => fileInputRef.current?.click()}>
                        <Upload className="w-4 h-4 me-1.5" />
                        تغيير الصورة
                      </Button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-40 rounded-lg border-2 border-dashed border-border hover:border-primary/50 transition flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground"
                  >
                    <Upload className="w-8 h-8" />
                    <span className="text-sm">اضغط لرفع صورة</span>
                    <span className="text-xs">PNG, JPG — حد أقصى 5MB</span>
                  </button>
                )}
              </div>

              {/* Title */}
              <div className="space-y-1.5">
                <Label>العنوان</Label>
                <Input
                  placeholder="عنوان البانر"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              {/* Active toggle */}
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <div className="text-sm font-medium">الحالة</div>
                  <div className="text-xs text-muted-foreground">
                    {isActive ? 'البانر نشط ويظهر في التطبيق' : 'البانر متوقف ولا يظهر'}
                  </div>
                </div>
                <Switch checked={isActive} onCheckedChange={setIsActive} />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t sticky bottom-0 bg-background">
              <Button variant="outline" onClick={closeDialog}>إلغاء</Button>
              <Button onClick={() => saveMutation.mutate()} disabled={!canSave || saveMutation.isPending}>
                {saveMutation.isPending && <Loader2 className="w-4 h-4 animate-spin me-1.5" />}
                {editingBanner ? 'حفظ التعديلات' : 'إضافة البانر'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
