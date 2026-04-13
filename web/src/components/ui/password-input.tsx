import { useState } from 'react'
import type { ComponentProps } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Input } from './input'
import { cn } from '@/lib/utils'

/**
 * Password input with a show/hide toggle button.
 *
 * Drop-in replacement for `<Input type="password" />`. Renders the usual
 * input, plus a button at the inline-end edge that swaps the type between
 * `password` and `text`. RTL-aware via `end-2`.
 *
 * Pass `autoComplete="new-password"` for signup/change-password flows and
 * `autoComplete="current-password"` for login flows.
 */
export function PasswordInput({
  className,
  dir,
  ...props
}: Omit<ComponentProps<'input'>, 'type'>) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative" dir={dir}>
      <Input
        type={show ? 'text' : 'password'}
        className={cn('pe-10', className)}
        dir={dir}
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
