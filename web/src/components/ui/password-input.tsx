import { useState } from 'react'
import type { ChangeEvent, ComponentProps } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Input } from './input'
import { sanitizePassword } from '@/lib/sanitize-password'
import { cn } from '@/lib/utils'

/**
 * Password input with a show/hide toggle button + silent input sanitation.
 *
 * Drop-in replacement for `<Input type="password" />`. Renders the usual
 * input, plus a button at the inline-end edge that swaps the type between
 * `password` and `text`. RTL-aware via `end-2`.
 *
 * Every keystroke / paste runs through `sanitizePassword()` which strips
 * Arabic characters, whitespace, and bidi/zero-width marks. The sanitised
 * value is what the parent sees via `onChange`, so downstream state, form
 * validation, and API calls are guaranteed to be clean — without the user
 * ever seeing an error toast about "invalid characters".
 *
 * Pass `autoComplete="new-password"` for signup/change-password flows and
 * `autoComplete="current-password"` for login flows.
 */
export function PasswordInput({
  className,
  dir,
  onChange,
  ...props
}: Omit<ComponentProps<'input'>, 'type'>) {
  const [show, setShow] = useState(false)

  // Wrap the caller's onChange so we mutate the synthetic event's
  // target.value BEFORE the parent sees it. Preserves the native
  // event shape (React form libraries like react-hook-form rely on
  // `e.target.name`, `e.target.value`, etc.), just with a cleaned
  // value. Cursor position is unaffected because the sanitizer only
  // removes characters — it never reorders.
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const clean = sanitizePassword(e.target.value)
    if (clean !== e.target.value) {
      e.target.value = clean
    }
    onChange?.(e)
  }

  return (
    <div className="relative" dir={dir}>
      <Input
        type={show ? 'text' : 'password'}
        className={cn('pe-10', className)}
        dir={dir ?? 'ltr'}
        onChange={handleChange}
        {...props}
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        tabIndex={-1}
        aria-label={show ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
        className="absolute end-1 top-1/2 -translate-y-1/2 w-10 h-10 inline-flex items-center justify-center rounded-2xl text-muted-foreground hover:text-foreground hover:bg-muted transition"
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  )
}
