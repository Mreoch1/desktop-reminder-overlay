type TitleBarProps = {
  title: string
  onMinimize: () => void
  onToggleMaximize: () => void
  onClose: () => void
  onOpenSettings: () => void
}

export function TitleBar({
  title,
  onMinimize,
  onToggleMaximize,
  onClose,
  onOpenSettings,
}: TitleBarProps) {
  return (
    <header className="title-bar">
      <div className="title-bar__drag">
        <span className="title-bar__title">{title}</span>
      </div>
      <div className="title-bar__actions">
        <button
          type="button"
          className="title-bar__btn"
          title="Settings"
          onClick={onOpenSettings}
        >
          Settings
        </button>
        <button
          type="button"
          className="title-bar__btn"
          title="Minimize"
          onClick={onMinimize}
        >
          —
        </button>
        <button
          type="button"
          className="title-bar__btn"
          title="Maximize"
          onClick={onToggleMaximize}
        >
          ▢
        </button>
        <button
          type="button"
          className="title-bar__btn title-bar__btn--close"
          title="Close window"
          onClick={onClose}
        >
          ×
        </button>
      </div>
    </header>
  )
}
