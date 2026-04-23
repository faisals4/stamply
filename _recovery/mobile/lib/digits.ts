/**
 * Normalise Arabic-Indic and Eastern Arabic-Indic (Persian) digits
 * to Latin 0-9.
 *
 * Users on Arabic keyboards often type numbers as ٠١٢٣٤٥٦٧٨٩. Passing
 * those straight to a `/\d/` regex (which matches only Latin digits)
 * would silently drop them and leave the input field empty. Convert
 * first, then filter.
 *
 *   - U+0660..U+0669 → 0..9  (Arabic-Indic)
 *   - U+06F0..U+06F9 → 0..9  (Extended / Persian)
 */
export function toLatinDigits(input: string): string {
  return input.replace(/[\u0660-\u0669\u06F0-\u06F9]/g, (ch) => {
    const code = ch.charCodeAt(0);
    if (code >= 0x0660 && code <= 0x0669) return String(code - 0x0660);
    return String(code - 0x06f0);
  });
}

/**
 * Normalise + keep only 0-9. Common pipeline for phone / OTP inputs
 * where the only valid characters are Latin digits.
 */
export function onlyDigits(input: string): string {
  return toLatinDigits(input).replace(/\D/g, '');
}
