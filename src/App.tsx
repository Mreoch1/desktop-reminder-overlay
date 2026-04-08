import { useCallback, useEffect, useRef, useState } from 'react'
import type { JSONContent } from '@tiptap/core'
import { NotesEditor } from './features/notes/NotesEditor'
import { TitleBar } from './components/TitleBar'
import { SettingsPanel } from './components/SettingsPanel'
import { Toast } from './components/Toast'
import { useAppStore } from './stores/appStore'
import type { AppData, AppSettings } from './shared/types'
import { DATA_VERSION, defaultSettings } from './shared/types'
import { emptyDoc } from './shared/defaultDoc'
import './app-shell.css'

function applyThemeClass(theme: 'light' | 'dark' | 'system'): void {
  const root = document.documentElement
  root.classList.remove('theme-light', 'theme-dark')
  if (theme === 'system') {
    const dark = window.matchMedia('(prefers-color-scheme: dark)').matches
    root.classList.add(dark ? 'theme-dark' : 'theme-light')
    return
  }
  root.classList.add(theme === 'dark' ? 'theme-dark' : 'theme-light')
}

export default function App() {
  const {
    ready,
    setReady,
    data,
    setData,
    docVersion,
    bumpDocVersion,
    patchSettings,
    setDoc,
  } = useAppStore()

  const [settingsOpen, setSettingsOpen] = useState(false)
  const [chromeActive, setChromeActive] = useState(false)
  const [shortcutHint, setShortcutHint] = useState<string | null>(null)
  const [toast, setToast] = useState<{
    message: string
    variant: 'error' | 'info'
  } | null>(null)
  const [appMeta, setAppMeta] = useState({ version: '…', userDataPath: '…' })

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const shortcutTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pointerInsideShell = useRef(false)
  const lastPointerInsideAt = useRef(0)
  const shellRef = useRef<HTMLDivElement | null>(null)

  const showToast = useCallback(
    (message: string, variant: 'error' | 'info' = 'info') => {
      if (toastTimer.current) clearTimeout(toastTimer.current)
      setToast({ message, variant })
      toastTimer.current = setTimeout(() => setToast(null), 6500)
    },
    [],
  )

  const persist = useCallback(
    async (payload: AppData) => {
      const r = await window.deskOverlay.saveData(payload)
      if (!r.ok) {
        showToast(`Save failed: ${r.error}`, 'error')
      }
    },
    [showToast],
  )

  const scheduleSave = useCallback(
    (next: AppData) => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => {
        void persist(next)
      }, 500)
    },
    [persist],
  )

  useEffect(() => {
    void window.deskOverlay
      .loadData()
      .then((loaded) => {
        setData(loaded)
        applyThemeClass(loaded.settings.theme)
        setReady(true)
        void window.deskOverlay.setOpacity(loaded.settings.opacity)
        void window.deskOverlay.setAlwaysOnTop(loaded.settings.alwaysOnTop)
      })
      .catch(() => {
        showToast('Could not load saved data. Defaults are used.', 'error')
        const fallback = {
          version: DATA_VERSION,
          doc: emptyDoc(),
          settings: defaultSettings(),
        }
        setData(fallback)
        applyThemeClass(fallback.settings.theme)
        setReady(true)
        void window.deskOverlay.setOpacity(fallback.settings.opacity)
        void window.deskOverlay.setAlwaysOnTop(fallback.settings.alwaysOnTop)
      })
  }, [setData, setReady, showToast])

  useEffect(() => {
    if (!ready) return
    void Promise.all([
      window.deskOverlay.getAppVersion(),
      window.deskOverlay.getPaths(),
    ]).then(([version, paths]) => {
      setAppMeta({ version, userDataPath: paths.userData })
    })
  }, [ready])

  useEffect(() => {
    if (!ready) return
    applyThemeClass(data.settings.theme)
  }, [ready, data.settings.theme])

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (): void => {
      if (data.settings.theme === 'system') {
        applyThemeClass('system')
      }
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [data.settings.theme])

  /** Design tokens on <html> so var(--dro-accent) etc. resolve everywhere (not only under .app-shell). */
  useEffect(() => {
    if (!ready) return
    const root = document.documentElement
    const st = data.settings
    root.style.setProperty('--dro-accent', st.accent)
    root.style.setProperty('--dro-font', st.fontFamily)
    root.style.setProperty('--dro-font-size', `${st.fontSizePx}px`)
    root.style.setProperty('--dro-line-height', String(st.lineHeight))
    root.style.setProperty('--dro-bg-opacity', String(st.bgOpacity))
    root.style.setProperty('--dro-chrome-dim-strength', String(st.chromeDimStrength))
  }, [ready, data.settings])

  const handleDocChange = useCallback(
    (doc: JSONContent) => {
      setDoc(doc)
      scheduleSave(useAppStore.getState().data)
    },
    [setDoc, scheduleSave],
  )

  const updateSettings = useCallback(
    (partial: Partial<AppSettings>) => {
      patchSettings(partial)
      const next = useAppStore.getState().data
      scheduleSave(next)
      return next.settings
    },
    [patchSettings, scheduleSave],
  )

  const onAlwaysOnTop = useCallback(
    (v: boolean) => {
      const s = updateSettings({ alwaysOnTop: v })
      void window.deskOverlay.setAlwaysOnTop(s.alwaysOnTop)
    },
    [updateSettings],
  )

  const onOpacity = useCallback(
    (v: number) => {
      const s = updateSettings({ opacity: v })
      void window.deskOverlay.setOpacity(s.opacity)
    },
    [updateSettings],
  )

  const onBgOpacity = useCallback(
    (v: number) => {
      updateSettings({ bgOpacity: v })
    },
    [updateSettings],
  )

  const onTheme = useCallback(
    (t: 'light' | 'dark' | 'system') => {
      updateSettings({ theme: t })
      applyThemeClass(t)
    },
    [updateSettings],
  )

  const onLaunchAtLogin = useCallback(
    (v: boolean) => {
      updateSettings({ launchAtLogin: v })
      void window.deskOverlay.setLaunchAtLogin(v)
    },
    [updateSettings],
  )

  const flushShortcut = useCallback(
    (acc: string | null) => {
      void window.deskOverlay.registerGlobalShortcut(acc).then((r) => {
        if (!r.ok) {
          setShortcutHint(r.reason ?? 'Could not register shortcut')
        } else {
          setShortcutHint(null)
        }
      })
    },
    [],
  )

  const onGlobalShortcut = useCallback(
    (acc: string | null) => {
      patchSettings({ globalShortcut: acc })
      if (shortcutTimer.current) clearTimeout(shortcutTimer.current)
      shortcutTimer.current = setTimeout(() => {
        flushShortcut(acc)
      }, 450)
    },
    [patchSettings, flushShortcut],
  )

  const onExport = useCallback(async () => {
    const r = await window.deskOverlay.exportData()
    if (r.error) {
      showToast(r.error, 'error')
      return
    }
    if (!r.canceled && r.path) {
      showToast(`Exported to ${r.path}`, 'info')
    }
  }, [showToast])

  const onImport = useCallback(async () => {
    const r = await window.deskOverlay.importData()
    if (r.error) {
      showToast(r.error, 'error')
      return
    }
    if (r.canceled || !r.data) return
    setData(r.data)
    bumpDocVersion()
    applyThemeClass(r.data.settings.theme)
    void window.deskOverlay.setOpacity(r.data.settings.opacity)
    void window.deskOverlay.setAlwaysOnTop(r.data.settings.alwaysOnTop)
    void persist(r.data)
    showToast('Backup imported.', 'info')
  }, [setData, bumpDocVersion, persist, showToast])

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
      if (shortcutTimer.current) clearTimeout(shortcutTimer.current)
      if (toastTimer.current) clearTimeout(toastTimer.current)
    }
  }, [])

  const activateChrome = useCallback(() => {
    setChromeActive(true)
  }, [])

  useEffect(() => {
    if (!ready || !data.settings.chromeDimUntilHover) return

    const updateChromeState = (x?: number, y?: number): void => {
      const now = Date.now()
      if (typeof x === 'number' && typeof y === 'number') {
        const rect = shellRef.current?.getBoundingClientRect()
        const hoverSlopPx = 8
        pointerInsideShell.current = Boolean(
          rect &&
            x >= rect.left - hoverSlopPx &&
            x <= rect.right + hoverSlopPx &&
            y >= rect.top - hoverSlopPx &&
            y <= rect.bottom + hoverSlopPx,
        )
        if (pointerInsideShell.current) {
          lastPointerInsideAt.current = now
        }
      }

      const holdAfterLeaveMs = 180
      const withinLeaveGrace = now - lastPointerInsideAt.current <= holdAfterLeaveMs
      setChromeActive(pointerInsideShell.current || withinLeaveGrace || settingsOpen)
    }

    let rafId = 0
    const onMouseMove = (e: MouseEvent): void => {
      if (rafId) cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(() => {
        updateChromeState(e.clientX, e.clientY)
      })
    }

    const onWindowFocus = (): void => updateChromeState()
    const onWindowBlur = (): void => {
      pointerInsideShell.current = false
      updateChromeState()
    }
    const onFocusIn = (): void => updateChromeState()
    const onFocusOut = (): void => updateChromeState()
    const onWindowMouseOut = (e: MouseEvent): void => {
      if (e.relatedTarget === null) {
        pointerInsideShell.current = false
        updateChromeState()
      }
    }

    updateChromeState()
    window.addEventListener('mousemove', onMouseMove, { passive: true })
    window.addEventListener('mouseout', onWindowMouseOut)
    window.addEventListener('focus', onWindowFocus)
    window.addEventListener('blur', onWindowBlur)
    window.addEventListener('focusin', onFocusIn)
    window.addEventListener('focusout', onFocusOut)

    return () => {
      if (rafId) cancelAnimationFrame(rafId)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseout', onWindowMouseOut)
      window.removeEventListener('focus', onWindowFocus)
      window.removeEventListener('blur', onWindowBlur)
      window.removeEventListener('focusin', onFocusIn)
      window.removeEventListener('focusout', onFocusOut)
    }
  }, [ready, data.settings.chromeDimUntilHover, settingsOpen])

  useEffect(() => {
    const off = window.deskOverlay.onShortcut(() => {
      /* focus from global shortcut */
    })
    return off
  }, [])

  if (!ready) {
    return (
      <div className="app-shell app-shell--loading">
        <p className="app-shell__loading">Loading…</p>
      </div>
    )
  }

  const s = data.settings
  const densityClass =
    s.density === 'compact' ? 'app-shell--compact' : 'app-shell--comfortable'

  return (
    <div
      ref={shellRef}
      className={`app-shell ${densityClass}${
        s.chromeDimUntilHover ? ' app-shell--chrome-dim' : ''
      }${s.chromeDimUntilHover && chromeActive ? ' app-shell--chrome-active' : ''}${
        s.chromeDimUntilHover && !chromeActive ? ' app-shell--chrome-idle' : ''
      }`}
      onFocusCapture={s.chromeDimUntilHover ? activateChrome : undefined}
    >
      <Toast
        message={toast?.message ?? null}
        variant={toast?.variant ?? 'info'}
        onDismiss={() => setToast(null)}
      />

      <TitleBar
        title="Desktop Reminder"
        onMinimize={() => void window.deskOverlay.minimize()}
        onToggleMaximize={() => void window.deskOverlay.toggleMaximize()}
        onClose={() => void window.deskOverlay.close()}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <main className="app-shell__main">
        <NotesEditor
          initialDoc={data.doc}
          docVersion={docVersion}
          sortMode={s.sortMode}
          onDocChange={handleDocChange}
        />
      </main>

      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        appVersion={appMeta.version}
        userDataPath={appMeta.userDataPath}
        alwaysOnTop={s.alwaysOnTop}
        onAlwaysOnTop={onAlwaysOnTop}
        opacity={s.opacity}
        onOpacity={onOpacity}
        bgOpacity={s.bgOpacity}
        onBgOpacity={onBgOpacity}
        chromeDimUntilHover={s.chromeDimUntilHover}
        onChromeDimUntilHover={(v) => updateSettings({ chromeDimUntilHover: v })}
        chromeDimStrength={s.chromeDimStrength}
        onChromeDimStrength={(v) => updateSettings({ chromeDimStrength: v })}
        theme={s.theme}
        onTheme={onTheme}
        accent={s.accent}
        onAccent={(c) => updateSettings({ accent: c })}
        fontFamily={s.fontFamily}
        onFontFamily={(f) => updateSettings({ fontFamily: f })}
        fontSizePx={s.fontSizePx}
        onFontSizePx={(n) => updateSettings({ fontSizePx: n })}
        lineHeight={s.lineHeight}
        onLineHeight={(n) => updateSettings({ lineHeight: n })}
        density={s.density}
        onDensity={(d) => updateSettings({ density: d })}
        sortMode={s.sortMode}
        onSortMode={(m) => updateSettings({ sortMode: m })}
        launchAtLogin={s.launchAtLogin}
        onLaunchAtLogin={onLaunchAtLogin}
        globalShortcut={s.globalShortcut}
        onGlobalShortcut={onGlobalShortcut}
        shortcutHint={shortcutHint}
        onExport={onExport}
        onImport={onImport}
      />
    </div>
  )
}
