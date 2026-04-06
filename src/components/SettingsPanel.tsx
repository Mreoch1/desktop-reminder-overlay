import { useEffect } from 'react'
import type { SortMode } from '../shared/types'

type SettingsPanelProps = {
  open: boolean
  onClose: () => void
  appVersion: string
  userDataPath: string
  alwaysOnTop: boolean
  onAlwaysOnTop: (v: boolean) => void
  opacity: number
  onOpacity: (v: number) => void
  bgOpacity: number
  onBgOpacity: (v: number) => void
  chromeDimUntilHover: boolean
  onChromeDimUntilHover: (v: boolean) => void
  chromeDimStrength: number
  onChromeDimStrength: (v: number) => void
  theme: 'light' | 'dark' | 'system'
  onTheme: (t: 'light' | 'dark' | 'system') => void
  accent: string
  onAccent: (c: string) => void
  fontFamily: string
  onFontFamily: (f: string) => void
  fontSizePx: number
  onFontSizePx: (n: number) => void
  lineHeight: number
  onLineHeight: (n: number) => void
  density: 'compact' | 'comfortable'
  onDensity: (d: 'compact' | 'comfortable') => void
  sortMode: SortMode
  onSortMode: (m: SortMode) => void
  launchAtLogin: boolean
  onLaunchAtLogin: (v: boolean) => void
  globalShortcut: string | null
  onGlobalShortcut: (acc: string | null) => void
  shortcutHint: string | null
  onExport: () => void
  onImport: () => void
}

export function SettingsPanel({
  open,
  onClose,
  appVersion,
  userDataPath,
  alwaysOnTop,
  onAlwaysOnTop,
  opacity,
  onOpacity,
  bgOpacity,
  onBgOpacity,
  chromeDimUntilHover,
  onChromeDimUntilHover,
  chromeDimStrength,
  onChromeDimStrength,
  theme,
  onTheme,
  accent,
  onAccent,
  fontFamily,
  onFontFamily,
  fontSizePx,
  onFontSizePx,
  lineHeight,
  onLineHeight,
  density,
  onDensity,
  sortMode,
  onSortMode,
  launchAtLogin,
  onLaunchAtLogin,
  globalShortcut,
  onGlobalShortcut,
  shortcutHint,
  onExport,
  onImport,
}: SettingsPanelProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="settings-overlay" role="dialog" aria-modal="true" aria-labelledby="settings-title">
      <div className="settings-overlay__backdrop" onClick={onClose} />
      <div className="settings-panel">
        <div className="settings-panel__head">
          <h2 id="settings-title" className="settings-panel__title">
            Settings
          </h2>
          <button type="button" className="settings-panel__close" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="settings-panel__body">
          <section className="settings-section">
            <h3 className="settings-section__label">Window</h3>
            <label className="settings-row">
              <input
                type="checkbox"
                checked={alwaysOnTop}
                onChange={(e) => onAlwaysOnTop(e.target.checked)}
              />
              Always on top
            </label>
            <label className="settings-row">
              Window opacity
              <input
                type="range"
                min={0.15}
                max={1}
                step={0.05}
                value={opacity}
                onChange={(e) => onOpacity(Number(e.target.value))}
              />
              <span className="settings-row__value">{Math.round(opacity * 100)}%</span>
            </label>
            <p className="settings-row__note">
              For the clearest reminder text, use 100% here and fade the panel with the
              controls below instead.
            </p>
            <label className="settings-row">
              Panel background opacity
              <input
                type="range"
                min={0.2}
                max={1}
                step={0.05}
                value={bgOpacity}
                onChange={(e) => onBgOpacity(Number(e.target.value))}
              />
              <span className="settings-row__value">{Math.round(bgOpacity * 100)}%</span>
            </label>
            <label className="settings-row settings-row--checkbox">
              <input
                type="checkbox"
                checked={chromeDimUntilHover}
                onChange={(e) => onChromeDimUntilHover(e.target.checked)}
              />
              Dim panel until hover or focus (reminder text stays sharp)
            </label>
            {chromeDimUntilHover ? (
              <label className="settings-row">
                How faded the frame is when idle
                <input
                  type="range"
                  min={0.12}
                  max={0.85}
                  step={0.03}
                  value={chromeDimStrength}
                  onChange={(e) => onChromeDimStrength(Number(e.target.value))}
                />
                <span className="settings-row__value">
                  {Math.round(chromeDimStrength * 100)}%
                </span>
              </label>
            ) : null}
          </section>

          <section className="settings-section">
            <h3 className="settings-section__label">Appearance</h3>
            <label className="settings-row">
              Theme
              <select
                value={theme}
                onChange={(e) =>
                  onTheme(e.target.value as 'light' | 'dark' | 'system')
                }
              >
                <option value="system">System</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </label>
            <label className="settings-row">
              Accent
              <input
                type="color"
                value={accent}
                onChange={(e) => onAccent(e.target.value)}
              />
            </label>
            <label className="settings-row">
              Font
              <input
                type="text"
                value={fontFamily}
                onChange={(e) => onFontFamily(e.target.value)}
                className="settings-row__input"
              />
            </label>
            <label className="settings-row">
              Font size (px)
              <input
                type="number"
                min={11}
                max={28}
                value={fontSizePx}
                onChange={(e) => onFontSizePx(Number(e.target.value))}
              />
            </label>
            <label className="settings-row">
              Line height
              <input
                type="range"
                min={1.1}
                max={1.8}
                step={0.05}
                value={lineHeight}
                onChange={(e) => onLineHeight(Number(e.target.value))}
              />
              <span className="settings-row__value">{lineHeight.toFixed(2)}</span>
            </label>
            <label className="settings-row">
              Density
              <select
                value={density}
                onChange={(e) =>
                  onDensity(e.target.value as 'compact' | 'comfortable')
                }
              >
                <option value="compact">Compact</option>
                <option value="comfortable">Comfortable</option>
              </select>
            </label>
          </section>

          <section className="settings-section">
            <h3 className="settings-section__label">Tasks</h3>
            <label className="settings-row">
              Sort order
              <select
                value={sortMode}
                onChange={(e) => onSortMode(e.target.value as SortMode)}
              >
                <option value="manual">Manual (default)</option>
                <option value="urgentFirst">Urgent first</option>
                <option value="alpha">Alphabetical</option>
                <option value="created">Created date</option>
              </select>
            </label>
          </section>

          <section className="settings-section">
            <h3 className="settings-section__label">Startup and shortcuts</h3>
            <label className="settings-row">
              <input
                type="checkbox"
                checked={launchAtLogin}
                onChange={(e) => onLaunchAtLogin(e.target.checked)}
              />
              Open at login
            </label>
            <label className="settings-row settings-row--col">
              Global show or hide shortcut
              <input
                type="text"
                className="settings-row__input"
                placeholder="CommandOrControl+Shift+."
                value={globalShortcut ?? ''}
                onChange={(e) =>
                  onGlobalShortcut(e.target.value.trim() || null)
                }
              />
              {shortcutHint ? (
                <span className="settings-row__hint">{shortcutHint}</span>
              ) : null}
              <button
                type="button"
                className="settings-inline-btn"
                onClick={() => onGlobalShortcut(null)}
              >
                Clear shortcut
              </button>
            </label>
          </section>

          <section className="settings-section">
            <h3 className="settings-section__label">Data</h3>
            <div className="settings-actions">
              <button type="button" className="settings-primary-btn" onClick={onExport}>
                Export backup
              </button>
              <button type="button" className="settings-primary-btn" onClick={onImport}>
                Import backup
              </button>
            </div>
            <p className="settings-footnote">
              Data is stored only on this computer. Export creates a JSON file you can move to another machine.
            </p>
            <p className="settings-meta">
              Version {appVersion}
              <br />
              <span className="settings-meta__path" title={userDataPath}>
                Data: {userDataPath}
              </span>
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
