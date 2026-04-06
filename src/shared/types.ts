import type { JSONContent } from '@tiptap/core'

export const DATA_VERSION = 1 as const

export type SortMode = 'manual' | 'urgentFirst' | 'alpha' | 'created'

export type AppSettings = {
  windowBounds: { x: number; y: number; width: number; height: number } | null
  displayId: number | null
  alwaysOnTop: boolean
  opacity: number
  theme: 'light' | 'dark' | 'system'
  accent: string
  fontFamily: string
  fontSizePx: number
  lineHeight: number
  density: 'compact' | 'comfortable'
  textOpacity: number
  bgOpacity: number
  /** Fade panel chrome (not reminder text); restore on hover or focus */
  chromeDimUntilHover: boolean
  /** Multiplier on panel chrome when dimmed (lower = more see-through). */
  chromeDimStrength: number
  sortMode: SortMode
  showCompletedArchive: boolean
  launchAtLogin: boolean
  /** Electron accelerator string, e.g. CommandOrControl+Shift+Space */
  globalShortcut: string | null
}

export type AppData = {
  version: typeof DATA_VERSION
  doc: JSONContent | null
  settings: AppSettings
}

export function defaultSettings(): AppSettings {
  return {
    windowBounds: null,
    displayId: null,
    alwaysOnTop: true,
    opacity: 1,
    theme: 'system',
    accent: '#2563eb',
    fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif',
    fontSizePx: 15,
    lineHeight: 1.45,
    density: 'comfortable',
    textOpacity: 1,
    bgOpacity: 0.74,
    chromeDimUntilHover: false,
    chromeDimStrength: 0.38,
    sortMode: 'manual',
    showCompletedArchive: false,
    launchAtLogin: false,
    globalShortcut: 'CommandOrControl+Shift+.',
  }
}
