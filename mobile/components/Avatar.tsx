import { useEffect, useState } from 'react';
import { View, Text, Image } from 'react-native';

type Props = {
  name?: string | null;
  email?: string | null;
  /** Pixel size of the rendered avatar (square). Defaults to 36. */
  size?: number;
  className?: string;
};

/**
 * Get the user's initials. Uses the first letter of their first word +
 * the first letter of their second word (e.g. "Faisal Alanazi" → "FA").
 * Falls back to a single letter for one-word names, or "?" if name is
 * empty.
 */
export function getInitials(name?: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
}

/**
 * SHA-256 hash the input using the Web Crypto API. This is available
 * on the web bundle (react-native-web exposes `crypto.subtle`) and on
 * modern native RN via the JS engine's global crypto polyfill in
 * newer Expo SDKs. Returns null on environments where it isn't wired
 * up so the caller can gracefully fall back to the initials bubble
 * instead of throwing.
 */
async function sha256Hex(input: string): Promise<string | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const subtle = (globalThis as any)?.crypto?.subtle as
    | {
        // BufferSource is the real Web Crypto signature (accepts
        // Uint8Array + ArrayBuffer) but we don't have the DOM lib
        // in the tsconfig, so we widen to unknown here and cast at
        // the call site.
        digest: (algo: string, data: unknown) => Promise<ArrayBuffer>;
      }
    | undefined;
  if (!subtle) return null;
  const buf = await subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Avatar that prefers Gravatar (by email SHA-256) and falls back to a
 * 2-letter initials bubble when no Gravatar exists or when the user
 * has no email at all.
 *
 * This is a 1-to-1 port of the merchant dashboard
 * `web/src/components/ui/avatar-img.tsx` so customer and merchant
 * surfaces read as one product — tweak one side, tweak the other.
 */
export function Avatar({ name, email, size = 36, className = '' }: Props) {
  const [src, setSrc] = useState<string | null>(null);
  const [errored, setErrored] = useState(false);
  const initials = getInitials(name);

  useEffect(() => {
    let cancelled = false;
    setErrored(false);
    if (!email) {
      setSrc(null);
      return;
    }
    sha256Hex(email.trim().toLowerCase()).then((hash) => {
      if (cancelled || !hash) return;
      // d=404 → Gravatar returns 404 when the email has no avatar,
      // which fires the <Image> onError callback below and drops us
      // back to the initials bubble.
      setSrc(`https://www.gravatar.com/avatar/${hash}?s=${size * 2}&d=404`);
    });
    return () => {
      cancelled = true;
    };
  }, [email, size]);

  const showImage = !!src && !errored;
  const fontSize = Math.max(10, Math.round(size * 0.4));

  return (
    <View
      accessibilityLabel={name ?? undefined}
      className={`items-center justify-center overflow-hidden rounded-full bg-brand-50 ${className}`}
      style={{ width: size, height: size }}
    >
      {showImage ? (
        <Image
          source={{ uri: src! }}
          style={{ width: size, height: size }}
          onError={() => setErrored(true)}
        />
      ) : (
        <Text
          className="font-bold text-brand"
          style={{ fontSize, lineHeight: fontSize * 1.1 }}
        >
          {initials}
        </Text>
      )}
    </View>
  );
}
