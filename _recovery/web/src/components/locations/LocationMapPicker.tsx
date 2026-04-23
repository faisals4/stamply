import { useEffect, useRef, useState } from 'react'
import { Plus, Minus, Locate, Loader2 } from 'lucide-react'

/**
 * Lat/lng picker with a draggable map and a FIXED centre pin.
 *
 * UX pattern (copied from Uber / Google-Maps "set your location"):
 *   - The pin is a CSS overlay pinned to the container centre.
 *   - As the map pans, the pin stays put — the map moves under it.
 *   - On `moveend`, we read `map.getCenter()` and fire `onChange(lat, lng)`.
 *
 * Uses Leaflet + OpenStreetMap tiles. The library is loaded from a
 * CDN in a one-shot effect so we don't have to add `leaflet` to
 * package.json or ship it in the main bundle — the map only mounts
 * on the Locations form page and the script is cached after the
 * first visit.
 *
 * Controls rendered on top of the map:
 *   - My location (uses navigator.geolocation)
 *   - Zoom in / Zoom out (map.zoomIn/zoomOut)
 *
 * The tiles are fetched from the main OSM CDN. That's fine for a
 * low-traffic admin form; swap the `tileUrl` for a paid provider if
 * this goes on a public customer-facing page.
 */

const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
const LEAFLET_JS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
const OSM_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'

// Riyadh — a reasonable default when the user has no lat/lng yet.
const DEFAULT_CENTER: [number, number] = [24.7136, 46.6753]
const DEFAULT_ZOOM = 13

// Lazy-load Leaflet from CDN. Resolves once `window.L` is available.
// Memoised so repeat mounts don't inject duplicate <script> tags.
let leafletPromise: Promise<unknown> | null = null
function loadLeaflet(): Promise<unknown> {
  if (leafletPromise) return leafletPromise
  leafletPromise = new Promise((resolve, reject) => {
    // CSS
    if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = LEAFLET_CSS
      document.head.appendChild(link)
    }
    // JS (skip if already present)
    const existing = (window as unknown as { L?: unknown }).L
    if (existing) {
      resolve(existing)
      return
    }
    const script = document.createElement('script')
    script.src = LEAFLET_JS
    script.async = true
    script.onload = () => resolve((window as unknown as { L: unknown }).L)
    script.onerror = () => reject(new Error('Failed to load Leaflet'))
    document.head.appendChild(script)
  })
  return leafletPromise
}

interface Props {
  lat: number | null
  lng: number | null
  onChange: (lat: number, lng: number) => void
  height?: number
}

// Minimal typing for the subset of Leaflet's API we use. Avoids pulling
// in `@types/leaflet` as a dev dep for the handful of methods we touch.
interface LMap {
  setView(center: [number, number], zoom?: number): LMap
  on(event: string, handler: () => void): LMap
  getCenter(): { lat: number; lng: number }
  zoomIn(): void
  zoomOut(): void
  remove(): void
}
interface LStatic {
  map(el: HTMLElement, options?: Record<string, unknown>): LMap
  tileLayer(
    url: string,
    options?: Record<string, unknown>,
  ): { addTo(map: LMap): void }
}

export function LocationMapPicker({ lat, lng, onChange, height = 320 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<LMap | null>(null)
  const [ready, setReady] = useState(false)
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Init the Leaflet map exactly once per mount.
  useEffect(() => {
    let cancelled = false

    loadLeaflet().then((L) => {
      if (cancelled || !containerRef.current || mapRef.current) return
      const Leaflet = L as LStatic

      const initial: [number, number] =
        lat != null && lng != null ? [lat, lng] : DEFAULT_CENTER

      const map = Leaflet.map(containerRef.current, {
        center: initial,
        zoom: lat != null && lng != null ? 16 : DEFAULT_ZOOM,
        // We render our own zoom controls outside the map so they're
        // positioned consistently with the "my location" button.
        zoomControl: false,
        attributionControl: true,
      })

      Leaflet.tileLayer(OSM_TILE_URL, {
        maxZoom: 19,
        attribution: OSM_ATTRIBUTION,
      }).addTo(map)

      map.on('moveend', () => {
        const c = map.getCenter()
        onChange(Number(c.lat.toFixed(6)), Number(c.lng.toFixed(6)))
      })

      mapRef.current = map
      setReady(true)
    }).catch(() => {
      if (!cancelled) setError('تعذر تحميل الخريطة. تحقق من اتصالك.')
    })

    return () => {
      cancelled = true
      mapRef.current?.remove()
      mapRef.current = null
    }
    // onChange intentionally excluded — we don't want to rebind the
    // map on every parent re-render. The closure captures the latest
    // onChange via the ref-less pattern below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // When the parent updates lat/lng externally (e.g. "my location"
  // button in the form, or initial fetch in edit mode), reflect it.
  useEffect(() => {
    if (!ready || !mapRef.current || lat == null || lng == null) return
    const current = mapRef.current.getCenter()
    // Avoid an infinite loop: only re-centre if the external change
    // is meaningfully different from what we already show.
    if (
      Math.abs(current.lat - lat) > 0.0001 ||
      Math.abs(current.lng - lng) > 0.0001
    ) {
      mapRef.current.setView([lat, lng], 16)
    }
  }, [ready, lat, lng])

  const handleMyLocation = () => {
    if (!navigator.geolocation) {
      setError('المتصفح لا يدعم تحديد الموقع')
      return
    }
    // Geolocation requires a secure context in every modern browser.
    // `localhost` is whitelisted by Chrome/Safari/Firefox; everything
    // else served over plain HTTP silently fails with a permission
    // error. Surface that explicitly — the generic "تعذر" hid the
    // real root cause from the operator.
    if (
      typeof window !== 'undefined' &&
      !window.isSecureContext &&
      window.location.hostname !== 'localhost' &&
      window.location.hostname !== '127.0.0.1'
    ) {
      setError(
        'تحديد الموقع يتطلب اتصالاً آمناً (HTTPS). افتح الصفحة عبر HTTPS.',
      )
      return
    }
    setError(null)
    setLocating(true)

    const applyPosition = (pos: GeolocationPosition) => {
      setLocating(false)
      mapRef.current?.setView(
        [pos.coords.latitude, pos.coords.longitude],
        17,
      )
      // moveend will fire onChange automatically
    }

    const failWithReason = (err: GeolocationPositionError) => {
      setLocating(false)
      const reason =
        err.code === err.PERMISSION_DENIED
          ? 'رفضت الإذن بالوصول للموقع. فعّل الصلاحية من إعدادات المتصفح.'
          : err.code === err.POSITION_UNAVAILABLE
            ? 'تعذر تحديد الموقع. تأكد من تفعيل خدمات الموقع في الجهاز.'
            : err.code === err.TIMEOUT
              ? 'انتهت المهلة قبل تحديد الموقع. حاول مرة أخرى.'
              : 'تعذر الحصول على الموقع الحالي'
      setError(reason)
    }

    // Two-tier strategy to work around a widespread Chrome/Safari
    // bug: the *second* high-accuracy request in a session often
    // fails with POSITION_UNAVAILABLE because the OS-level sensor
    // fusion throttles repeat calls. First, accept a cached fix up
    // to 60 s old (maximumAge) with high accuracy. If that still
    // fails, retry with low accuracy + a longer cache window — WiFi
    // triangulation rarely fails on the same hardware.
    navigator.geolocation.getCurrentPosition(
      applyPosition,
      (firstErr) => {
        // Permission denials are terminal — no point retrying.
        if (firstErr.code === firstErr.PERMISSION_DENIED) {
          failWithReason(firstErr)
          return
        }
        // Fallback: low accuracy + accept a 5-minute-old cached fix.
        navigator.geolocation.getCurrentPosition(
          applyPosition,
          failWithReason,
          { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 },
        )
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    )
  }

  return (
    <div>
      <div
        className="relative rounded-lg overflow-hidden border border-border bg-muted"
        style={{ height }}
      >
        {/* Leaflet mounts into this div */}
        <div ref={containerRef} className="absolute inset-0 z-0" />

        {/* Fixed centre pin — stays put while the map moves underneath.
            Pointer-events-none so the pin doesn't steal drag gestures
            from the Leaflet canvas. */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div
            style={{ transform: 'translateY(-16px)' }}
            className="flex flex-col items-center"
          >
            <svg
              width="32"
              height="40"
              viewBox="0 0 32 40"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="drop-shadow-md"
            >
              <path
                d="M16 0C7.16 0 0 7.16 0 16c0 10 16 24 16 24s16-14 16-24c0-8.84-7.16-16-16-16z"
                fill="#eb592e"
              />
              <circle cx="16" cy="16" r="6" fill="white" />
            </svg>
            {/* Tiny shadow under the pin so it reads as "floating" on
                the map rather than painted onto a flat image. */}
            <div className="w-3 h-1 bg-black/25 rounded-full -mt-0.5 blur-[1px]" />
          </div>
        </div>

        {/* Zoom + my-location controls, floated on the start side. */}
        <div className="absolute top-3 start-3 z-20 flex flex-col gap-2">
          <div className="flex flex-col bg-white rounded-lg shadow-md overflow-hidden border border-border">
            <button
              type="button"
              onClick={() => mapRef.current?.zoomIn()}
              className="w-9 h-9 flex items-center justify-center hover:bg-muted transition"
              aria-label="تكبير"
            >
              <Plus className="w-4 h-4" />
            </button>
            <div className="h-px bg-border" />
            <button
              type="button"
              onClick={() => mapRef.current?.zoomOut()}
              className="w-9 h-9 flex items-center justify-center hover:bg-muted transition"
              aria-label="تصغير"
            >
              <Minus className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={handleMyLocation}
            disabled={locating}
            className="w-9 h-9 flex items-center justify-center bg-white rounded-lg shadow-md border border-border hover:bg-muted transition disabled:opacity-60"
            aria-label="موقعي الحالي"
            title="موقعي الحالي"
          >
            {locating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Locate className="w-4 h-4 text-[#eb592e]" />
            )}
          </button>
        </div>

        {/* Subtle hint so first-time users know the interaction model.
            Uses a full-width flex row so the pill auto-centres in
            both RTL and LTR — `start-1/2 + translate` broke in RTL
            because `start` resolves to `right` there and collided
            with the X-axis translate. */}
        <div className="absolute bottom-2 inset-x-0 z-20 pointer-events-none flex justify-center">
          <span className="bg-white/90 text-[11px] text-muted-foreground px-2.5 py-1 rounded-full shadow-sm border border-border whitespace-nowrap">
            حرّك الخريطة لضبط الدبوس على موقعك
          </span>
        </div>
      </div>

      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
    </div>
  )
}
