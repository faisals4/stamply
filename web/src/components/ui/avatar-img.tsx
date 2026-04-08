import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface AvatarProps {
  name?: string | null
  email?: string | null
  /** Pixel size of the rendered avatar (square). Defaults to 36. */
  size?: number
  className?: string
}

/**
 * Get the user's initials. Uses the first letter of their first word + the
 * first letter of their second word (e.g. "Faisal Alanazi" → "FA"). Falls
 * back to a single letter for one-word names, or "?" if name is empty.
 */
export function getInitials(name?: string | null): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase()
}

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(input),
  )
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Avatar that prefers Gravatar (by email SHA-256) and falls back to a
 * 2-letter initials bubble when no Gravatar exists or when the user has
 * no email at all.
 *
 * Centralised so every place in the app stays visually consistent.
 */
export function Avatar({ name, email, size = 36, className }: AvatarProps) {
  const [src, setSrc] = useState<string | null>(null)
  const [errored, setErrored] = useState(false)
  const initials = getInitials(name)

  useEffect(() => {
    let cancelled = false
    setErrored(false)
    if (!email) {
      setSrc(null)
      return
    }
    sha256Hex(email.trim().toLowerCase()).then((hash) => {
      if (!cancelled) {
        // d=404 → Gravatar returns 404 when the email has no avatar, which
        // triggers our img.onerror and falls back to initials.
        setSrc(`https://www.gravatar.com/avatar/${hash}?s=${size * 2}&d=404`)
      }
    })
    return () => {
      cancelled = true
    }
  }, [email, size])

  const showImage = !!src && !errored

  return (
    <div
      className={cn(
        'rounded-full bg-primary/10 text-primary flex items-center justify-center font-medium overflow-hidden shrink-0 select-none',
        className,
      )}
      style={{
        width: size,
        height: size,
        fontSize: Math.max(10, Math.round(size * 0.4)),
      }}
      aria-label={name ?? undefined}
    >
      {showImage ? (
        <img
          src={src!}
          alt=""
          width={size}
          height={size}
          referrerPolicy="no-referrer"
          onError={() => setErrored(true)}
          className="w-full h-full object-cover"
        />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  )
}
