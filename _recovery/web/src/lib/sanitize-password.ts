/**
 * Strip characters that have no place inside a password:
 *   - Arabic letters / digits / punctuation (U+0600–U+06FF + Arabic
 *     presentation forms at U+FB50–U+FDFF and U+FE70–U+FEFF)
 *   - Any whitespace (space, tab, non-breaking space, zero-width
 *     joiners that sneak in from mobile IME autocorrect)
 *
 * Why: operators often type passwords while their keyboard is still
 * in Arabic mode, accidentally committing a mix that no login flow
 * will ever replay. Spaces cause the same class of "password correct
 * on paper but wrong on screen" bugs — rather than validate-and-warn
 * we silently strip and show the cleaned value live.
 *
 * Ranges handled:
 *   - \u0600-\u06FF  Arabic block (letters, digits, diacritics, punct)
 *   - \u0750-\u077F  Arabic Supplement
 *   - \u08A0-\u08FF  Arabic Extended-A
 *   - \uFB50-\uFDFF  Arabic Presentation Forms-A
 *   - \uFE70-\uFEFF  Arabic Presentation Forms-B
 *   - \s             all whitespace (\n, \t, space, NBSP, etc.)
 *   - \u200B-\u200F  zero-width / directional marks
 *   - \u202A-\u202E  bidi overrides (common paste-from-WhatsApp noise)
 */
const BAD_CHARS =
  /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\s\u200B-\u200F\u202A-\u202E]+/g

export function sanitizePassword(value: string): string {
  if (!value) return ''
  return value.replace(BAD_CHARS, '')
}
