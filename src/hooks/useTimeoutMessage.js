import { useState, useRef, useEffect, useCallback } from 'react'

/**
 * Transient message with auto-clear, cleaned up on unmount.
 *
 * Replaces the repeated unsafe pattern of `setMessage(x); setTimeout(() =>
 * setMessage(null), ms)` where the timer is never cleared — which fires a
 * setState on an unmounted component (React warning) if the view closes before
 * the timeout elapses. The timer is held in a ref and cleared on unmount and on
 * every new `show`, so it can never overwrite state after unmount or stack up.
 *
 * Returns [message, show]. `show(msg)` sets the message and schedules a clear
 * after `ms`; `show(null)` clears immediately.
 *
 * @param {number} ms auto-clear delay (default 4000)
 */
export function useTimeoutMessage(ms = 4000) {
  const [message, setMessage] = useState(null)
  const timer = useRef(null)

  useEffect(() => () => clearTimeout(timer.current), [])

  const show = useCallback((msg) => {
    clearTimeout(timer.current)
    setMessage(msg ?? null)
    if (msg != null) timer.current = setTimeout(() => setMessage(null), ms)
  }, [ms])

  return [message, show]
}

export default useTimeoutMessage
