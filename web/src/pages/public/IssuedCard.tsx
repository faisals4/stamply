import { useRoute } from 'wouter'
import { useQuery } from '@tanstack/react-query'
import { Loader2, Copy, CheckCircle2, Gift, Bell } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { getIssuedCard, getWalletAvailability } from '@/lib/api/misc'
import { detectWalletTarget } from '@/lib/wallet/detectTarget'
import { DEFAULT_LABELS } from '@/types/card'
import {
  fetchPublicPushConfig,
  isPushSupported,
  currentPermission,
  getExistingSubscription,
  subscribeToPush,
} from '@/lib/wallet/webPush'
import { CardVisual } from '@/components/card/CardVisual'
import { PublicShell } from './Register'
import { PhoneVerificationBlock } from './PhoneVerificationBlock'
import type { CardTemplate, CardReward } from '@/types/card'

/**
 * /i/:serial — public PWA view of an issued card. This is what the customer
 * bookmarks or (in Phase 2) installs to Apple/Google Wallet.
 */
export default function IssuedCardPage() {
  const [, params] = useRoute('/i/:serial')
  const serial = params?.serial ?? ''
  const [copied, setCopied] = useState(false)

  // Web Push subscription state. Lives entirely in the browser — server
  // only knows "is there a token for this customer?" via the push_tokens
  // table, which `fetchPublicPushConfig` doesn't reveal (privacy).
  const [pushSubscribed, setPushSubscribed] = useState(false)
  const [pushBusy, setPushBusy] = useState(false)
  const [pushError, setPushError] = useState<string | null>(null)

  // One-shot top banner that nudges first-time visitors to enable push.
  // Shows for 4 seconds then slides away. Persists the "already shown"
  // flag in localStorage keyed by serial so reopening the same card
  // doesn't nag the customer again. A different card on the same
  // device still gets its own prompt once.
  const [showPushHint, setShowPushHint] = useState(false)

  const { data, isLoading, error } = useQuery({
    queryKey: ['issued', serial],
    queryFn: () => getIssuedCard(serial),
    enabled: !!serial,
    refetchInterval: 5000, // live updates every 5s so stamps appear shortly after cashier acts
  })

  const { data: wallet } = useQuery({
    queryKey: ['wallet-availability'],
    queryFn: getWalletAvailability,
    staleTime: 5 * 60_000,
  })

  // Device sniff runs once per page load. `useMemo` keeps the result
  // stable so React Query's refetches don't accidentally flip which
  // wallet badges are visible mid-session. Rules: iOS → Apple only,
  // Android → Google only, anything else → both (desktop, undetectable).
  const walletTarget = useMemo(() => detectWalletTarget(), [])
  const showAppleBtn = walletTarget === 'apple' || walletTarget === 'both'
  const showGoogleBtn = walletTarget === 'google' || walletTarget === 'both'

  // Only fetch push config if we have a serial and the browser supports push.
  const pushSupported = isPushSupported()
  const { data: pushConfig } = useQuery({
    queryKey: ['push-config', serial],
    queryFn: () => fetchPublicPushConfig(serial),
    enabled: pushSupported && !!serial,
    staleTime: 5 * 60_000,
  })

  // On mount, restore subscribed-state from the existing browser subscription
  // so the button label is accurate on page reload.
  useEffect(() => {
    if (!pushSupported) return
    getExistingSubscription().then((sub) => {
      setPushSubscribed(!!sub)
    })
  }, [pushSupported])

  // Top push hint banner. Gated on:
  //   - browser supports push
  //   - tenant has push enabled
  //   - customer isn't already subscribed
  // Shows on EVERY page mount (no localStorage throttle) — the
  // merchant wants a gentle but persistent reminder on every visit.
  // The delay (`120ms`) lets the page fully paint before the banner
  // slides in so they don't fight for the same space. After 4s on
  // screen it fades away; the customer can still enable from the
  // notification tile below if they miss it.
  useEffect(() => {
    if (!pushSupported) return
    if (!pushConfig?.enabled || !pushConfig.vapid_public_key) return
    if (pushSubscribed) return
    if (typeof window === 'undefined') return

    const showTimer = window.setTimeout(() => {
      setShowPushHint(true)
    }, 120)

    const hideTimer = window.setTimeout(() => {
      setShowPushHint(false)
    }, 120 + 4000)

    return () => {
      window.clearTimeout(showTimer)
      window.clearTimeout(hideTimer)
    }
  }, [pushSupported, pushConfig?.enabled, pushConfig?.vapid_public_key, pushSubscribed, serial])

  const handleSubscribe = async () => {
    if (!pushConfig?.vapid_public_key) return
    setPushBusy(true)
    setPushError(null)
    try {
      const ok = await subscribeToPush(serial, pushConfig.vapid_public_key)
      if (ok) {
        setPushSubscribed(true)
      } else {
        const perm = currentPermission()
        setPushError(
          perm === 'denied'
            ? 'تم رفض الإذن. فعّل التنبيهات من إعدادات المتصفح'
            : 'تعذّر تفعيل التنبيهات',
        )
      }
    } catch (e) {
      setPushError('حدث خطأ غير متوقع')
    } finally {
      setPushBusy(false)
    }
  }

  const copyLink = async () => {
    await navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  if (isLoading) {
    return (
      <PublicShell>
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin me-2" />
          جارٍ التحميل...
        </div>
      </PublicShell>
    )
  }

  if (error || !data) {
    return (
      <PublicShell>
        <div className="text-center py-20">
          <h1 className="text-xl font-semibold mb-2">البطاقة غير موجودة</h1>
          <p className="text-sm text-muted-foreground">تحقق من الرابط أو تواصل مع المقهى.</p>
        </div>
      </PublicShell>
    )
  }

  // Adapt API shape → CardVisual's CardTemplate (the reusable component
  // expects the admin-side shape with camelCase + string reward IDs).
  const adaptedCard = {
    name: data.template.name,
    design: data.template.design,
    rewards: data.template.rewards.map(
      (r): CardReward => ({
        id: String(r.id),
        name: r.name,
        stampsRequired: r.stamps_required,
      }),
    ),
  } as unknown as CardTemplate

  // How many full cards the customer can redeem right now.
  const firstReward = data.template.rewards[0]
  const requiredForNext = firstReward?.stamps_required ?? 0
  const readyToRedeem =
    requiredForNext > 0 ? Math.floor(data.stamps_count / requiredForNext) : 0

  return (
    <PublicShell>
      {/* First-visit push hint — `fixed top` so it floats above the
          card, tappable for a one-click enable. Uses a CSS transition
          on opacity + translate-y so it slides in AND out smoothly
          without any animation library. When `showPushHint` flips to
          false the banner fades up and away over 300ms. `pointer-events`
          is gated on the visible state so the invisible tile doesn't
          intercept taps after it's hidden. */}
      {pushSupported && pushConfig?.enabled && pushConfig.vapid_public_key && !pushSubscribed && (
        <div
          className={`fixed top-4 inset-x-0 z-50 flex justify-center px-4 transition-all duration-300 ease-out ${
            showPushHint
              ? 'opacity-100 translate-y-0 pointer-events-auto'
              : 'opacity-0 -translate-y-3 pointer-events-none'
          }`}
          aria-hidden={!showPushHint}
        >
          <button
            type="button"
            onClick={() => {
              setShowPushHint(false)
              if (!pushBusy) handleSubscribe()
            }}
            className="w-full max-w-md rounded-full bg-card/95 backdrop-blur-md border border-amber-300 shadow-lg px-4 py-3 flex items-center gap-3 text-start hover:bg-amber-50 transition"
          >
            <div className="w-9 h-9 rounded-full bg-amber-500/15 flex items-center justify-center shrink-0">
              <Bell className="w-4 h-4 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold">فعّل التنبيهات</div>
              <div className="text-[11px] text-muted-foreground truncate">
                استلم عروض التاجر وأختامك لحظة بلحظة
              </div>
            </div>
            <span className="text-[11px] font-semibold text-primary shrink-0">
              تفعيل
            </span>
          </button>
        </div>
      )}

      <div className="space-y-4">
        <CardVisual
          card={adaptedCard}
          collectedStamps={data.stamps_count}
          customerName={data.customer.name}
          qrValue={data.serial_number}
        />

        {/* Ready-to-redeem alert — the big one the customer wants to see */}
        {readyToRedeem > 0 && (
          <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-4 flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
              <Gift className="w-6 h-6 text-emerald-700" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-emerald-900">
                {readyToRedeem === 1
                  ? 'لديك بطاقة جاهزة للاستبدال'
                  : readyToRedeem === 2
                    ? 'لديك بطاقتان جاهزتان للاستبدال'
                    : `لديك ${readyToRedeem} بطاقات جاهزة للاستبدال`}
              </div>
              <div className="text-[11px] text-emerald-800/80 mt-0.5">
                أظهر هذه الشاشة للكاشير عند التجار لاستلام {firstReward?.name ?? 'المكافأة'}
              </div>
            </div>
          </div>
        )}

        {/* The old inline push opt-in tile was removed intentionally.
            The only push CTA is now the top banner that slides in on
            every page mount for 4 seconds. Keeps the card body clean
            for customers who already have notifications enabled AND
            for those who haven't but will see the banner anyway. */}

        {/* Add to Wallet (Phase 2) — only visible when provider is
            configured AND the user's device actually uses it. On an
            iPhone we hide the Google badge and vice-versa; when the
            device is undetectable (desktop, DevTools without touch,
            reduced UA) we show both so the customer is never stuck. */}
        {((wallet?.apple && showAppleBtn) || (wallet?.google && showGoogleBtn)) && (
          <div className="space-y-2">
            {wallet.apple && showAppleBtn && (
              <a
                href={`${import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8888/api'}/public/wallet/apple/${data.serial_number}.pkpass`}
                className="block mx-auto focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-black rounded-[10px]"
                aria-label="Add to Apple Wallet"
              >
                {/* Official Apple Wallet "Add to Apple Wallet" badge.
                    Locale picked from the browser's preferred language:
                    anything starting with `ar` gets the Arabic artwork,
                    everything else falls back to the US/UK English one.
                    Apple's brand guidelines require the badge to stay
                    at a minimum height of ~40pt, so we lock a 48px
                    height and let the SVG preserve its own aspect. */}
                <img
                  src={
                    typeof navigator !== 'undefined' &&
                    navigator.language?.toLowerCase().startsWith('ar')
                      ? '/wallet-badges/add-to-apple-wallet-ar.svg'
                      : '/wallet-badges/add-to-apple-wallet-en.svg'
                  }
                  alt="Add to Apple Wallet"
                  className="h-12 w-auto mx-auto"
                  draggable={false}
                />
              </a>
            )}
            {wallet.google && showGoogleBtn && (
              <button
                type="button"
                onClick={async () => {
                  const base = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8888/api'
                  const res = await fetch(`${base}/public/wallet/google/${data.serial_number}`)
                  const json = await res.json()
                  if (json.data?.save_url) {
                    window.location.href = json.data.save_url
                  } else {
                    alert(json.message ?? 'تعذر الوصول إلى Google Wallet')
                  }
                }}
                className="block mx-auto focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-black rounded-[10px]"
                aria-label="Add to Google Wallet"
              >
                {/* Official Google Wallet "Add to Google Wallet" badge.
                    Same locale-switching logic as the Apple variant:
                    anything starting with `ar` gets the Arabic artwork,
                    everything else falls back to en-US. Google's brand
                    guidelines call for ≥ 40dp height, so h-12 (48px) is
                    the safe minimum. */}
                <img
                  src={
                    typeof navigator !== 'undefined' &&
                    navigator.language?.toLowerCase().startsWith('ar')
                      ? '/wallet-badges/add-to-google-wallet-ar.svg'
                      : '/wallet-badges/add-to-google-wallet-en.svg'
                  }
                  alt="Add to Google Wallet"
                  className="h-12 w-auto mx-auto"
                  draggable={false}
                />
              </button>
            )}
          </div>
        )}

        {/* Phone verification — only shown when:
              (1) the platform operator hasn't globally disabled the
                  feature in /op/settings (default: enabled), AND
              (2) the customer hasn't already proven ownership of
                  their phone via OTP.
            Once they verify (cross-tenant), this block unmounts on
            the next card refetch. Signup itself never blocked on
            this; it's an opt-in trust upgrade. */}
        {data.features?.phone_verification !== false &&
          data.customer.phone_verified_at === null && (
            <PhoneVerificationBlock serial={data.serial_number} />
          )}

        {/* Copy-link affordance — previously lived inside the
            "مالك البطاقة" card. The customer's identity is already
            visible on the wallet pass itself, so we drop the card
            and keep just the link action as a borderless muted
            button to stay quiet on the page. */}
        <button
          type="button"
          onClick={copyLink}
          className="w-full text-xs text-muted-foreground hover:text-foreground flex items-center justify-center gap-1.5 py-2"
        >
          {copied ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5" />
              تم نسخ الرابط
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              نسخ رابط البطاقة
            </>
          )}
        </button>

        {data.template.rewards.length > 1 && (
          <div className="bg-card rounded-2xl border p-4">
            {/* Heading follows the tenant's own "reward" label from
                /admin/cards → Design tab (stored on
                `template.design.labels.reward`). When the merchant
                hasn't overridden it, we fall back to the global
                DEFAULT_LABELS.reward — the same source the cashier
                dashboard and wallet pass read from. This way the
                public page always mirrors whatever the merchant
                wrote in the editor. */}
            <h3 className="font-semibold text-sm mb-3">
              {data.template.design?.labels?.reward?.trim() ||
                DEFAULT_LABELS.reward}
            </h3>
            <ul className="space-y-2">
              {data.template.rewards.map((r) => {
                const canClaim = data.stamps_count >= r.stamps_required
                return (
                  <li
                    key={r.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className={canClaim ? 'font-medium' : 'text-muted-foreground'}>
                      {r.name}
                    </span>
                    <span
                      className={`text-xs ${canClaim ? 'text-emerald-600 font-semibold' : 'text-muted-foreground'}`}
                    >
                      {canClaim ? 'جاهزة ✓' : `${r.stamps_required} طوابع`}
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </div>
    </PublicShell>
  )
}
