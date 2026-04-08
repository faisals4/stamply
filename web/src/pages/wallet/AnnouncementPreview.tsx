import { useEffect, useState } from 'react'
import { MoreHorizontal, Info, Bell, ChevronLeft, X, Share } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  /** Live-updating announcement text typed by the merchant. */
  message: string
}

/**
 * Animated 3-stage walkthrough showing how an Apple Wallet announcement
 * actually reaches the customer. Loops forever while the form is open
 * so the merchant can watch their message preview in context.
 *
 * Stages (mirrors the 3 real screenshots from iPhone):
 *   1. Pass front — user taps the "..." button in the top right
 *   2. Pass menu  — "Pass Details" / "Notifications" popover
 *   3. Pass back  — "Latest announcement" section with the live message
 *
 * Each stage dwells for ~3s, then a crossfade + slide transitions to
 * the next one. The message text updates in real time — if the merchant
 * edits the textarea, stage 3 immediately reflects the new content.
 */
export function AnnouncementPreview({ message }: Props) {
  const [stage, setStage] = useState<0 | 1 | 2>(0)

  // Auto-advance the stages in a loop. We use setTimeout rather than
  // a single setInterval so we can give stage 3 a longer dwell time
  // (the user needs more time to read the actual announcement than to
  // see the earlier tap-and-open transitions).
  useEffect(() => {
    const dwellMs = [2800, 2200, 3500][stage]
    const t = setTimeout(
      () => setStage(((stage + 1) % 3) as 0 | 1 | 2),
      dwellMs,
    )
    return () => clearTimeout(t)
  }, [stage])

  const placeholder = 'اكتب الرسالة في الخانة لتظهر هنا...'
  const displayMessage = message.trim() || placeholder
  const isPlaceholder = !message.trim()

  return (
    <div className="flex flex-col items-center">
      {/* Stage indicator + label */}
      <div className="flex items-center gap-2 mb-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={cn(
              'h-1.5 rounded-full transition-all duration-500',
              stage === i ? 'w-8 bg-primary' : 'w-1.5 bg-muted-foreground/30',
            )}
          />
        ))}
      </div>
      <div className="text-[11px] text-muted-foreground mb-3 h-4 transition-all">
        {stage === 0 && 'الخطوة 1 — العميل يضغط القائمة'}
        {stage === 1 && 'الخطوة 2 — يختار Pass Details'}
        {stage === 2 && 'الخطوة 3 — يشاهد إعلانك في الأسفل'}
      </div>

      {/* iPhone frame */}
      <div className="relative w-[280px] rounded-[2.5rem] bg-neutral-900 p-2.5 shadow-2xl">
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-24 h-5 bg-black rounded-full z-20" />
        <div className="rounded-[2rem] overflow-hidden bg-neutral-100 h-[560px] relative">
          {/* Status bar */}
          <div
            dir="ltr"
            className="flex items-center justify-between px-5 pt-6 pb-2 text-[11px] font-semibold text-neutral-900 bg-neutral-100"
          >
            <span>3:17</span>
            <span className="text-[9px] tracking-tight">•••• WiFi 🔋</span>
          </div>

          {/* Stage 0 — pass front with "..." button that bounces */}
          <div
            className={cn(
              'absolute inset-0 top-10 transition-all duration-500',
              stage === 0
                ? 'opacity-100 translate-x-0'
                : 'opacity-0 -translate-x-4 pointer-events-none',
            )}
          >
            <StageFront />
          </div>

          {/* Stage 1 — the "..." popover */}
          <div
            className={cn(
              'absolute inset-0 top-10 transition-all duration-500',
              stage === 1
                ? 'opacity-100 translate-x-0'
                : 'opacity-0 translate-x-4 pointer-events-none',
            )}
          >
            <StageMenu />
          </div>

          {/* Stage 2 — the pass "back" / details screen with the announcement */}
          <div
            className={cn(
              'absolute inset-0 top-10 transition-all duration-500',
              stage === 2
                ? 'opacity-100 translate-x-0'
                : 'opacity-0 translate-x-4 pointer-events-none',
            )}
          >
            <StageDetails message={displayMessage} isPlaceholder={isPlaceholder} />
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────── */
/*  Individual stages                                              */
/* ─────────────────────────────────────────────────────────────── */

/** Stage 0: pass front. Shows the card + a bouncing "..." icon hint. */
function StageFront() {
  return (
    <div dir="ltr" className="h-full flex flex-col px-3">
      {/* Top bar with X on left and pulsing "..." on right */}
      <div className="flex items-center justify-between pt-2 pb-3">
        <div className="w-8 h-8 rounded-full bg-white shadow flex items-center justify-center">
          <X className="w-4 h-4 text-neutral-900" />
        </div>
        {/* Share + bouncing "..." indicator */}
        <div className="flex items-center gap-1.5">
          <div className="w-8 h-8 rounded-full bg-white shadow flex items-center justify-center">
            <Share className="w-4 h-4 text-neutral-900" />
          </div>
          <div className="relative">
            <div className="w-8 h-8 rounded-full bg-white shadow flex items-center justify-center animate-pulse ring-2 ring-primary/50 ring-offset-2 ring-offset-neutral-100">
              <MoreHorizontal className="w-4 h-4 text-neutral-900" />
            </div>
            {/* Tap indicator */}
            <div className="absolute -bottom-1 -left-1 w-3 h-3 rounded-full bg-primary animate-ping" />
          </div>
        </div>
      </div>

      {/* Miniature pass — purple card with grid of coffee circles */}
      <PassCardMini />
    </div>
  )
}

/** Stage 1: the "..." popover sliding down with Pass Details + Notifications. */
function StageMenu() {
  return (
    <div dir="ltr" className="h-full flex flex-col px-3 relative">
      {/* Same top bar but with "..." highlighted */}
      <div className="flex items-center justify-between pt-2 pb-3">
        <div className="w-8 h-8 rounded-full bg-white shadow flex items-center justify-center">
          <X className="w-4 h-4 text-neutral-900" />
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-8 h-8 rounded-full bg-white shadow flex items-center justify-center">
            <Share className="w-4 h-4 text-neutral-900" />
          </div>
          <div className="w-8 h-8 rounded-full bg-primary shadow flex items-center justify-center">
            <MoreHorizontal className="w-4 h-4 text-primary-foreground" />
          </div>
        </div>
      </div>

      {/* Pass card dimmed behind the popover */}
      <div className="opacity-30 pointer-events-none">
        <PassCardMini />
      </div>

      {/* Popover — absolutely positioned so it overlays the top right */}
      <div className="absolute top-12 right-3 w-[180px] rounded-xl bg-white shadow-2xl border border-neutral-200 overflow-hidden animate-in slide-in-from-top-2 fade-in duration-300">
        {/* "Pass Details" row — highlighted as the next tap target */}
        <div className="flex items-center gap-2.5 px-3 py-2.5 bg-primary/10 border-b border-neutral-100">
          <Info className="w-4 h-4 text-primary" />
          <span className="text-[13px] font-medium text-neutral-900">
            Pass Details
          </span>
          <div className="ms-auto w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
        </div>
        <div className="flex items-center gap-2.5 px-3 py-2.5">
          <Bell className="w-4 h-4 text-neutral-500" />
          <span className="text-[13px] text-neutral-700">Notifications</span>
        </div>
      </div>
    </div>
  )
}

/** Stage 2: pass details screen with the "Latest announcement" row. */
function StageDetails({
  message,
  isPlaceholder,
}: {
  message: string
  isPlaceholder: boolean
}) {
  return (
    <div dir="ltr" className="h-full flex flex-col px-3 pt-2 bg-neutral-100">
      {/* Back button row */}
      <div className="flex items-center justify-between mb-3">
        <div className="w-8 h-8 rounded-full bg-white shadow flex items-center justify-center">
          <ChevronLeft className="w-4 h-4 text-neutral-900" />
        </div>
        <div className="w-8 h-8 rounded-full bg-white shadow flex items-center justify-center">
          <Share className="w-4 h-4 text-neutral-900" />
        </div>
      </div>

      {/* Mini pass thumbnail */}
      <div className="mx-auto w-[140px] mb-3">
        <PassCardMini compact />
      </div>
      <div className="text-center text-[15px] font-bold text-neutral-900 leading-tight">
        بطاقة الولاء
      </div>
      <div className="text-center text-[10px] text-neutral-500 mb-3">
        Updated just now
      </div>

      {/* Settings list (simplified) */}
      <div className="rounded-xl bg-white border border-neutral-200 mb-2 text-[11px] text-neutral-600 px-3 py-2">
        Automatic Updates • Allow Notifications • Suggest on Lock Screen
      </div>

      {/* THE ANNOUNCEMENT CARD — this is the star of the show */}
      <div
        className={cn(
          'rounded-xl bg-white border-2 p-3 transition-all',
          'border-primary/40 shadow-lg shadow-primary/10 ring-2 ring-primary/20',
        )}
      >
        <div className="text-[11px] font-semibold text-neutral-900 mb-1">
          Latest announcement
        </div>
        <div
          dir="rtl"
          className={cn(
            'text-[12px] leading-relaxed whitespace-pre-wrap',
            isPlaceholder
              ? 'text-neutral-400 italic'
              : 'text-neutral-900',
          )}
        >
          {message}
        </div>
      </div>
    </div>
  )
}

/**
 * The tiny purple "order cafe" card that appears in every stage. Kept
 * as a pure visual fixture so the animation can focus on the flow.
 * `compact` shrinks the stamps grid for the details screen.
 */
function PassCardMini({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={cn(
        'rounded-[14px] overflow-hidden shadow',
        compact ? 'p-2' : 'p-3',
      )}
      style={{ background: '#E9D5FF' }}
    >
      {/* Header — generic placeholder logo square + program name */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <div
            className={cn(
              'rounded bg-purple-900/80 shrink-0',
              compact ? 'w-3 h-3' : 'w-4 h-4',
            )}
          />
          <div
            className={cn(
              'font-semibold text-neutral-900 truncate',
              compact ? 'text-[8px]' : 'text-[10px]',
            )}
          >
            بطاقة الولاء
          </div>
        </div>
        <div className="text-right shrink-0">
          <div
            className={cn(
              'uppercase text-neutral-700 leading-none',
              compact ? 'text-[7px]' : 'text-[8px]',
            )}
          >
            GIFT
          </div>
          <div
            className={cn(
              'font-bold text-neutral-900 leading-none',
              compact ? 'text-[9px]' : 'text-[11px]',
            )}
          >
            0
          </div>
        </div>
      </div>

      {/* Stamps grid (2×5 mini) */}
      <div
        className="rounded-lg p-1.5 grid grid-cols-5 gap-1"
        style={{ background: '#D8B4FE' }}
      >
        {Array.from({ length: 10 }).map((_, i) => {
          const filled = i < 2
          return (
            <div
              key={i}
              className={cn(
                'aspect-square rounded-full border flex items-center justify-center',
                filled
                  ? 'border-[1.5px] border-purple-900 text-purple-900'
                  : 'border-[1px] border-purple-300 text-purple-300',
                compact ? 'text-[6px]' : 'text-[7px]',
              )}
            >
              ☕
            </div>
          )
        })}
      </div>

      {/* Footer row */}
      {!compact && (
        <div className="flex justify-between mt-2 text-[8px]">
          <div>
            <div className="uppercase text-neutral-700 leading-none">STAMPS</div>
            <div className="font-bold text-neutral-900 leading-none mt-0.5">
              2/10
            </div>
          </div>
          <div className="text-right">
            <div className="uppercase text-neutral-700 leading-none">
              CUSTOMER
            </div>
            <div className="font-bold text-neutral-900 leading-none mt-0.5">
              Customer Name
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
