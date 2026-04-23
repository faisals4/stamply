/**
 * Shared iPhone lock-screen notification preview.
 *
 * Used on both `/op/notifications/send` (live mirror of the composer)
 * and `/op/notifications/:id` (read-only snapshot of what was sent).
 * Keeping one implementation avoids drift between the two views —
 * anything the operator sees while composing is pixel-identical to
 * what the detail page shows afterwards.
 *
 * The iPhone frame uses plain CSS (no SVG assets) so the preview
 * scales crisply at any viewport and stays in the same stylesheet
 * as the rest of the dashboard — no extra network fetch, no tint
 * mismatch on light/dark themes.
 */
export function IOSNotificationPreview({
  title,
  body,
  imageUrl,
  sticky = true,
}: {
  title: string
  body: string
  imageUrl: string
  /** Stick the preview to the top on lg+ screens (composer use case). */
  sticky?: boolean
}) {
  const nowLabel = 'الآن'

  // Fallback copy keeps the preview populated when the fields are
  // empty so the layout is never blank mid-composition.
  const previewTitle = title.trim() || 'عنوان الإشعار'
  const previewBody =
    body.trim() || 'النص الذي سيظهر للمستخدم سيعرض هنا.'

  return (
    <div className={`mx-auto ${sticky ? 'lg:sticky lg:top-4' : ''}`}>
      <p className="text-sm font-medium text-foreground mb-3 text-center">
        معاينة على iPhone
      </p>

      <div
        className="relative mx-auto rounded-[3rem] border-[10px] border-neutral-900 bg-neutral-900 shadow-2xl"
        style={{ width: 320, height: 650 }}
      >
        {/* Dynamic Island */}
        <div className="absolute left-1/2 top-2 -translate-x-1/2 h-7 w-[110px] rounded-full bg-black z-10" />

        {/* Screen with lock-screen gradient wallpaper */}
        <div
          className="relative h-full w-full overflow-hidden rounded-[2.2rem]"
          style={{
            background:
              'linear-gradient(180deg, #1a1a2e 0%, #2d2847 40%, #5b3a6e 70%, #8a4a62 100%)',
          }}
        >
          {/* Status bar: time + icons (cosmetic) */}
          <div className="flex items-center justify-between px-6 pt-3 text-white text-xs font-semibold">
            <span>9:41</span>
            <span className="flex items-center gap-1 text-[10px] opacity-90">
              <span>●●●●</span>
              <span className="ml-1">􀙇</span>
              <span>􀛨</span>
            </span>
          </div>

          {/* Lock screen clock */}
          <div className="mt-8 text-center text-white/90">
            <div className="text-xs font-medium tracking-wide opacity-80">
              الأربعاء، ١٥ أبريل
            </div>
            <div
              className="text-6xl font-light leading-none mt-1"
              style={{ fontFeatureSettings: '"tnum"' }}
            >
              9:41
            </div>
          </div>

          {/* Notification banner */}
          <div className="absolute inset-x-3 bottom-20">
            <div
              className="rounded-2xl overflow-hidden shadow-lg"
              style={{
                background: 'rgba(255, 255, 255, 0.82)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
              }}
            >
              {/* Header row: app icon + app name + timestamp */}
              <div className="flex items-center gap-2 px-3 pt-2.5">
                <AppIcon />
                <span className="text-[11px] font-semibold text-neutral-800 uppercase tracking-wide">
                  Stamply
                </span>
                <span className="ms-auto text-[11px] text-neutral-600">
                  {nowLabel}
                </span>
              </div>

              {/* Title + body + optional image. */}
              <div className="flex items-start gap-3 px-3 pb-3 pt-1">
                <div className="min-w-0 flex-1">
                  <div
                    className="text-[13px] font-semibold text-neutral-900 leading-tight line-clamp-2"
                    dir="auto"
                  >
                    {previewTitle}
                  </div>
                  <div
                    className="text-[13px] text-neutral-800 leading-snug mt-0.5 line-clamp-3"
                    dir="auto"
                  >
                    {previewBody}
                  </div>
                </div>

                {imageUrl.trim() ? (
                  <img
                    src={imageUrl}
                    alt=""
                    className="h-11 w-11 rounded-md object-cover flex-shrink-0"
                    onError={(e) => {
                      ;(e.currentTarget as HTMLImageElement).style.display =
                        'none'
                    }}
                  />
                ) : null}
              </div>
            </div>
          </div>

          {/* Home indicator */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 h-1 w-28 rounded-full bg-white/70" />
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground mt-3 text-center max-w-xs mx-auto">
        المعاينة توضيحية. الشكل النهائي قد يختلف قليلاً حسب إعدادات
        الإشعارات في جهاز المستخدم.
      </p>
    </div>
  )
}

/**
 * Stamply app icon rendered as a rounded square. Uses the PNG from
 * /public/icon.png so the preview matches Notification Center
 * pixel-for-pixel. Falls back to a colored tile if the asset fails.
 */
function AppIcon() {
  return (
    <div className="h-6 w-6 rounded-[7px] overflow-hidden flex-shrink-0 bg-[#eb592e] flex items-center justify-center">
      <img
        src="/icon.png"
        alt="Stamply"
        className="h-full w-full object-cover"
        onError={(e) => {
          ;(e.currentTarget as HTMLImageElement).style.display = 'none'
        }}
      />
    </div>
  )
}
