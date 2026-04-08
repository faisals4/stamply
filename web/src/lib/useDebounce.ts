import { useEffect, useState } from 'react'

/**
 * Returns a debounced copy of `value` — updates only after the caller stops
 * changing it for `delay` milliseconds. Used to throttle search inputs so a
 * server-side query fires once per keystroke burst, not on every character.
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}
