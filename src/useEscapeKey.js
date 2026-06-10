// Global ESC key handler — closes any modal that registers itself
// Usage: useEscapeKey(onClose) in any modal component

import { useEffect } from 'react'

// Global stack of active modals
const modalStack = []

export function useEscapeKey(onClose, hasUnsavedChanges = false) {
  useEffect(() => {
    const handler = { onClose, hasUnsavedChanges }
    modalStack.push(handler)

    const handleKeyDown = (e) => {
      if (e.key !== 'Escape') return
      // Only fire for topmost modal
      if (modalStack[modalStack.length - 1] !== handler) return
      e.stopPropagation()
      if (hasUnsavedChanges) {
        const confirm = window.confirm('You have unsaved changes. Close anyway?')
        if (!confirm) return
      }
      onClose()
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      const idx = modalStack.indexOf(handler)
      if (idx > -1) modalStack.splice(idx, 1)
    }
  }, [onClose, hasUnsavedChanges])
}

export default useEscapeKey
