type ToastProps = {
  message: string | null
  variant?: 'error' | 'info'
  onDismiss: () => void
}

export function Toast({ message, variant = 'info', onDismiss }: ToastProps) {
  if (!message) return null

  return (
    <div
      className={`app-toast app-toast--${variant}`}
      role="status"
      aria-live="polite"
    >
      <span className="app-toast__text">{message}</span>
      <button
        type="button"
        className="app-toast__dismiss"
        onClick={onDismiss}
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  )
}
