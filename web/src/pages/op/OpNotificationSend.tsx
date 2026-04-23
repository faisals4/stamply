import { useRef, useState } from 'react'
import { useLocation } from 'wouter'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Send,
  Loader2,
  Bell,
  Upload,
  X as XIcon,
} from 'lucide-react'
import { BackButton } from '@/components/ui/back-button'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { EmojiPicker, insertAtCaret } from '@/components/ui/emoji-picker'
import {
  sendOpBroadcast,
  getOpNotificationStats,
  uploadOpNotificationImage,
  type OpBroadcastScope,
} from '@/lib/api/op/notifications'
import { IOSNotificationPreview } from './notifications/IOSNotificationPreview'

/**
 * /op/notifications/send
 *
 * Dedicated page for composing and sending a platform-wide push
 * notification. Replaces the previous in-page modal so the form gets
 * a real URL (deep-link / back-button friendly) and breathing room
 * to show a live iOS preview next to the composer.
 *
 * Layout:
 *   - Left column:  composer form (title, body, image upload, deep link)
 *   - Right column: iPhone mockup showing how the banner will render
 *                   on a locked iOS screen in real time as the
 *                   operator types.
 */

// Lock-screen truncation thresholds. iOS clips the title at roughly
// 50–60 chars on the bolded first line, and collapses the body at
// ~178 chars (across two lines) before the "…" ellipsis appears.
// Matching the backend's `validate` max so the UI never allows a
// payload the server would reject.
const TITLE_MAX = 60
const BODY_MAX = 178

export default function OpNotificationSendPage() {
  const [, setLocation] = useLocation()
  const qc = useQueryClient()
  const [scope] = useState<OpBroadcastScope>('platform')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [deepLink, setDeepLink] = useState('')
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  // Refs for the title + body inputs so the EmojiPicker can insert at
  // the current caret position instead of always appending at the end.
  const titleRef = useRef<HTMLInputElement>(null)
  const bodyRef = useRef<HTMLTextAreaElement>(null)

  // Audience preview — shown under the page subtitle so the operator
  // sees the impact before pressing Send.
  const { data: stats } = useQuery({
    queryKey: ['op-notifications-stats'],
    queryFn: () => getOpNotificationStats(),
  })

  const upload = useMutation({
    mutationFn: (file: File) => uploadOpNotificationImage(file),
    onSuccess: (res) => {
      setImageUrl(res.url)
      setUploadError(null)
    },
    onError: (err: unknown) => {
      const axiosErr = err as { response?: { data?: { message?: string } } }
      setUploadError(axiosErr.response?.data?.message ?? 'فشل رفع الصورة')
    },
  })

  const send = useMutation({
    mutationFn: () =>
      sendOpBroadcast({
        scope,
        title,
        body,
        image_url: imageUrl || undefined,
        deep_link: deepLink || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['op-notifications'] })
      setLocation('/op/notifications')
    },
    onError: (err: unknown) => {
      const axiosErr = err as { response?: { data?: { message?: string } } }
      alert(axiosErr.response?.data?.message ?? 'تعذر الإرسال')
    },
  })

  // Character counts use the UTF-16 code-unit length from .length — same
  // measure Laravel's `max:N` validator applies server-side, so the
  // inline counter matches the backend's cut-off for emoji and Arabic.
  const titleLen = title.length
  const bodyLen = body.length
  const titleOver = titleLen > TITLE_MAX
  const bodyOver = bodyLen > BODY_MAX

  const canSend =
    title.trim() &&
    body.trim() &&
    !titleOver &&
    !bodyOver &&
    !send.isPending &&
    !upload.isPending

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    // Client-side guard so the user sees the 5 MB cap before the
    // round-trip. Backend also enforces.
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('الحد الأقصى 5 ميجابايت')
      e.target.value = ''
      return
    }
    upload.mutate(file)
    // Reset so picking the same file again re-triggers onChange.
    e.target.value = ''
  }

  return (
    <div className="max-w-6xl">
      {/* Standard /op detail-page header pattern: BackButton + PageHeader.
          Same as OpTenantDetail / OpCustomerDetail / OpSubscriptionDetail
          and the admin-side detail pages — a single back affordance at
          the top instead of an action button in the header. */}
      <BackButton href="/op/notifications" label="الإشعارات" />

      <PageHeader
        icon={<Bell />}
        title="إرسال إشعار إعلاني"
        subtitle={
          stats
            ? `سيصل إلى ${stats.platform_tokens.toLocaleString('ar')} جهاز نشط`
            : '...'
        }
      />

      {/* Two-column layout: form on the start side, preview on the
          end side. Stacks vertically below lg so the preview is still
          reachable on small laptops. */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8 items-start">
        {/* Composer */}
        <div>
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <Label>العنوان</Label>
                  <EmojiPicker
                    onPick={(e) =>
                      setTitle((prev) =>
                        insertAtCaret(titleRef.current, prev, e).slice(
                          0,
                          TITLE_MAX,
                        ),
                      )
                    }
                  />
                </div>
                <CharCounter
                  count={titleLen}
                  max={TITLE_MAX}
                  over={titleOver}
                />
              </div>
              <Input
                ref={titleRef}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="مثلاً: تحديث جديد في Stamply"
                maxLength={TITLE_MAX}
                className={titleOver ? 'border-red-500' : ''}
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <Label>النص</Label>
                  <EmojiPicker
                    onPick={(e) =>
                      setBody((prev) =>
                        insertAtCaret(bodyRef.current, prev, e).slice(
                          0,
                          BODY_MAX,
                        ),
                      )
                    }
                  />
                </div>
                <CharCounter count={bodyLen} max={BODY_MAX} over={bodyOver} />
              </div>
              <textarea
                ref={bodyRef}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="اكتب نص الإشعار الذي سيظهر للمستخدم"
                rows={5}
                maxLength={BODY_MAX}
                className={`flex w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none ${
                  bodyOver ? 'border-red-500' : 'border-input'
                }`}
              />
            </div>

            {/* Image upload. Hidden native input triggered by the
                "اختر صورة" button keeps the styling consistent with
                the rest of the shadcn-ui surface. When a URL is
                present (either uploaded or manually pasted), show a
                thumbnail + clear button. */}
            <div className="space-y-1.5">
              <Label>الصورة (اختياري)</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleFilePick}
                className="hidden"
              />

              {imageUrl ? (
                <div className="flex items-center gap-3 rounded-md border border-border bg-background p-2">
                  <img
                    src={imageUrl}
                    alt=""
                    className="h-14 w-14 rounded object-cover flex-shrink-0 border border-border"
                    onError={(e) => {
                      ;(e.currentTarget as HTMLImageElement).style.display =
                        'none'
                    }}
                  />
                  <span className="text-xs text-muted-foreground break-all flex-1 min-w-0">
                    {imageUrl}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setImageUrl('')
                      setUploadError(null)
                    }}
                    className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition flex-shrink-0"
                    aria-label="إزالة الصورة"
                  >
                    <XIcon className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={upload.isPending}
                  >
                    {upload.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin me-1.5" />
                    ) : (
                      <Upload className="w-4 h-4 me-1.5" />
                    )}
                    {upload.isPending ? 'جارٍ الرفع...' : 'اختر صورة'}
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    PNG / JPG / WEBP • حتى 5 MB
                  </span>
                </div>
              )}

              {uploadError ? (
                <p className="text-xs text-red-500">{uploadError}</p>
              ) : null}

              <p className="text-xs text-muted-foreground">
                أو الصق رابط صورة HTTPS مباشرة:
              </p>
              <Input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://…/banner.jpg"
              />
              <p className="text-xs text-muted-foreground">
                iOS يحتاج Notification Service Extension لعرض الصورة.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label>رابط عميق (اختياري)</Label>
              <Input
                value={deepLink}
                onChange={(e) => setDeepLink(e.target.value)}
                placeholder="stamply://offers أو https://stamply.cards/…"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 mt-5">
            <Button
              variant="outline"
              onClick={() => setLocation('/op/notifications')}
              disabled={send.isPending}
            >
              إلغاء
            </Button>
            <Button onClick={() => send.mutate()} disabled={!canSend}>
              {send.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin me-1.5" />
              ) : (
                <Send className="w-4 h-4 me-1.5" />
              )}
              إرسال
            </Button>
          </div>
        </div>

        {/* iOS preview */}
        <IOSNotificationPreview
          title={title}
          body={body}
          imageUrl={imageUrl}
        />
      </div>
    </div>
  )
}

// -----------------------------------------------------------------
// Character counter
// -----------------------------------------------------------------

/**
 * Tiny inline badge that shows `used / max` under each input label.
 * Turns red once the user crosses the limit so it's obvious without
 * having to hunt for a hidden error message.
 */
function CharCounter({
  count,
  max,
  over,
}: {
  count: number
  max: number
  over: boolean
}) {
  return (
    <span
      className={`text-[11px] tabular-nums ${
        over
          ? 'text-red-500 font-medium'
          : count > max * 0.9
            ? 'text-amber-600'
            : 'text-muted-foreground'
      }`}
    >
      {count.toLocaleString('ar')} / {max.toLocaleString('ar')}
    </span>
  )
}


