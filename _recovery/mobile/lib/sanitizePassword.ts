/**
 * Strip characters that have no place inside a password, matching the
 * web dashboard's `sanitizePassword` so the same account works from any
 * platform:
 *   - Arabic letters / digits / punctuation + presentation forms
 *   - Any whitespace (space, tab, zero-width joiners pasted from IME)
 *   - Bidi and direction override marks
 *
 * Why: merchants often type passwords while an Arabic keyboard is still
 * active, producing a value that looks right on-screen but has invisible
 * characters the server never received. Rather than validate-and-warn,
 * strip silently and show the cleaned value live.
 */
const BAD_CHARS =
  /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\s\u200B-\u200F\u202A-\u202E]+/g;

export function sanitizePassword(value: string): string {
  if (!value) return '';
  return value.replace(BAD_CHARS, '');
}
