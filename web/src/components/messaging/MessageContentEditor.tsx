import { type ReactNode } from 'react'
import { Eye, Variable, Code2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { renderWithSampleVars } from './sample-vars'

export type MessageEditorChannel = 'email' | 'sms' | 'push'

interface Props {
  channel: MessageEditorChannel

  /** Email subject (only used when channel === 'email'). */
  subject?: string
  onSubjectChange?: (s: string) => void

  /** Body content. For email this is HTML; for SMS plain text. */
  body: string
  onBodyChange: (s: string) => void

  /**
   * Variable catalog: { 'customer.first_name': 'الاسم الأول', ... }.
   * Each entry renders as a clickable chip that appends `{{key}}` to the body.
   */
  variables?: Record<string, string>

  /** Optional sender phone shown in the SMS phone mockup. */
  smsFromNumber?: string

  /** Header / status banner injected above the editor card (e.g. save flash). */
  banner?: ReactNode

  /** Slot rendered at the bottom of the editor card (e.g. save buttons). */
  editorActions?: ReactNode

  /** Override the textarea row count. */
  rows?: number

  /** Optional helper text under the body textarea. */
  bodyHelper?: ReactNode
}

/**
 * Unified content editor for any tenant messaging surface.
 *
 * Two-column layout on desktop:
 *   ┌─────────────────────────┐ ┌───────────────┐
 *   │ subject (email only)    │ │ live preview  │
 *   │ body textarea           │ │ (sticky)      │
 *   │ variables grid          │ │               │
 *   │ slot: editor actions    │ └───────────────┘
 *   └─────────────────────────┘
 *
 * Used by:
 *  - /admin/messages/new (broadcast compose)
 *  - /admin/settings/email-templates/:key
 *  - /admin/settings/sms-templates/:key
 *
 * Each consumer wraps this with its own page-level controls (save, send,
 * channel picker, audience picker, etc.) — but the editing UX itself is
 * identical across the three places.
 */
export function MessageContentEditor({
  channel,
  subject = '',
  onSubjectChange,
  body,
  onBodyChange,
  variables,
  smsFromNumber,
  banner,
  editorActions,
  rows,
  bodyHelper,
}: Props) {
  const isEmail = channel === 'email'
  const isPush = channel === 'push'
  const renderedBody = renderWithSampleVars(body)
  const renderedSubject = renderWithSampleVars(subject)

  const insertVariable = (key: string) => {
    const token = `{{${key}}}`
    const sep = body.length === 0 || body.endsWith(' ') || body.endsWith('\n') ? '' : ' '
    onBodyChange(body + sep + token)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-6">
      {/* ─── Left: editor ─────────────────────────────── */}
      <div className="space-y-4">
        {banner}

        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          {(isEmail || isPush) && (
            <div className="space-y-1.5">
              <Label htmlFor="msg-subject">
                {isPush ? 'عنوان التنبيه' : 'عنوان البريد'}
              </Label>
              <Input
                id="msg-subject"
                value={subject}
                onChange={(e) => onSubjectChange?.(e.target.value)}
                placeholder={
                  isPush
                    ? 'مثال: عرض جديد من {{brand.name}}'
                    : 'مثال: أهلاً بك في {{brand.name}}'
                }
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="msg-body" className="flex items-center gap-1.5">
              {isEmail ? (
                <>
                  <Code2 className="w-3.5 h-3.5" />
                  محتوى HTML
                </>
              ) : (
                'الرسالة'
              )}
            </Label>
            <Textarea
              id="msg-body"
              value={body}
              onChange={(e) => onBodyChange(e.target.value)}
              rows={rows ?? (isEmail ? 18 : 6)}
              dir={isEmail ? 'ltr' : undefined}
              className={cn(isEmail && 'font-mono text-xs leading-relaxed')}
            />
            {bodyHelper && (
              <div className="text-[11px] text-muted-foreground">{bodyHelper}</div>
            )}
            {!bodyHelper && (
              <p className="text-[11px] text-muted-foreground">
                {isEmail ? (
                  <>
                    يدعم HTML كامل (ألوان، صور، روابط). استخدم المتغيرات أدناه
                    لإضافة بيانات العميل ديناميكياً، مثال:{' '}
                    <code className="bg-muted px-1 rounded font-mono" dir="ltr">
                      {'{{customer.first_name}}'}
                    </code>
                  </>
                ) : (
                  <>
                    استخدم المتغيرات أدناه لإضافة بيانات العميل، مثال:{' '}
                    <code className="bg-muted px-1 rounded font-mono" dir="ltr">
                      {'{{customer.first_name}}'}
                    </code>
                  </>
                )}
              </p>
            )}
          </div>

          {editorActions && <div className="border-t pt-4">{editorActions}</div>}
        </div>

        {variables && Object.keys(variables).length > 0 && (
          <div className="rounded-xl border bg-card p-5">
            <div className="flex items-center gap-2 mb-1">
              <Variable className="w-4 h-4 text-muted-foreground" />
              <h3 className="font-semibold text-sm">المتغيرات المتاحة</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              اضغط على أي متغير لإدراجه في نهاية المحتوى
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {Object.entries(variables).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => insertVariable(key)}
                  className="flex items-center justify-between gap-2 p-2.5 rounded-md border bg-background hover:border-primary hover:bg-primary/5 transition text-start"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-medium truncate">{label}</div>
                    <code className="text-[10px] text-muted-foreground font-mono" dir="ltr">
                      {`{{${key}}}`}
                    </code>
                  </div>
                  <Code2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ─── Right: live preview ──────────────────────── */}
      <aside className="space-y-3 lg:sticky lg:top-6 lg:self-start">
        <div className="text-xs text-muted-foreground flex items-center gap-1.5 px-1">
          <Eye className="w-3.5 h-3.5" />
          معاينة حية
        </div>

        {isEmail ? (
          <EmailPreview subject={renderedSubject} html={renderedBody} />
        ) : isPush ? (
          <PushPreview title={renderedSubject} body={renderedBody} />
        ) : (
          <SmsPhoneMockup body={renderedBody} from={smsFromNumber} />
        )}

        <p className="text-[11px] text-muted-foreground text-center">
          المعاينة تستخدم بيانات عينة للمتغيرات
        </p>
      </aside>
    </div>
  )
}

/* ─── preview sub-components (exported for direct use too) ───── */

export function SmsPhoneMockup({ body, from }: { body: string; from?: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="bg-neutral-900 rounded-3xl p-2.5 mx-auto max-w-[280px] shadow-xl">
        <div className="bg-neutral-800 rounded-[1.6rem] overflow-hidden">
          <div className="px-3 py-2 text-[10px] text-neutral-400 flex justify-between">
            <span>9:41</span>
            <span>📶 📵 🔋</span>
          </div>
          <div className="px-3 py-3">
            <div className="bg-white rounded-2xl p-3 shadow-sm">
              {from && (
                <div className="text-[10px] text-muted-foreground mb-1">
                  من: <span className="font-mono">{from}</span>
                </div>
              )}
              <div className="text-sm leading-relaxed whitespace-pre-wrap break-words text-black">
                {body || 'اكتب الرسالة...'}
              </div>
            </div>
          </div>
          <div className="h-10" />
        </div>
      </div>
    </div>
  )
}

/**
 * Simple notification-banner preview for push channel. Mimics what a system
 * notification looks like on iOS/Android — a rounded tile with app icon,
 * title, body, and timestamp.
 */
export function PushPreview({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border bg-muted/30 p-4">
      <div className="text-[10px] text-muted-foreground mb-2 text-center">
        شكل التنبيه على شاشة جوال العميل
      </div>
      <div className="rounded-2xl bg-card border shadow-sm p-3 flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shrink-0">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-5 h-5 text-primary-foreground"
          >
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
            <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="font-semibold text-sm truncate">
              {title || '(بدون عنوان)'}
            </div>
            <div className="text-[10px] text-muted-foreground shrink-0">الآن</div>
          </div>
          <div className="text-xs text-muted-foreground mt-0.5 whitespace-pre-line">
            {body || 'اكتب نص التنبيه...'}
          </div>
        </div>
      </div>
    </div>
  )
}

export function EmailPreview({ subject, html }: { subject: string; html: string }) {
  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b bg-muted/30">
        <div className="text-[10px] text-muted-foreground">العنوان:</div>
        <div className="text-sm font-medium truncate">{subject || '(بدون عنوان)'}</div>
      </div>
      {html.trim() ? (
        <div
          className="p-0 bg-white max-h-[600px] overflow-y-auto"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <div className="p-8 bg-white text-center text-sm text-muted-foreground">
          اكتب محتوى HTML لرؤية المعاينة
        </div>
      )}
    </div>
  )
}
