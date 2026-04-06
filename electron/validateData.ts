import type { JSONContent } from '@tiptap/core'
import type { AppData, AppSettings, SortMode } from '../src/shared/types'
import { DATA_VERSION, defaultSettings } from '../src/shared/types'
import { emptyDoc } from '../src/shared/defaultDoc'
import { normalizeChecklistDoc } from '../src/shared/normalizeChecklistDoc'

const SORT_MODES: SortMode[] = ['manual', 'urgentFirst', 'alpha', 'created']

function isObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
}

function coerceSettings(raw: unknown): AppSettings {
  const base = defaultSettings()
  if (!isObject(raw)) {
    return base
  }
  const s = raw as Record<string, unknown>
  return {
    ...base,
    ...(typeof s.alwaysOnTop === 'boolean' && { alwaysOnTop: s.alwaysOnTop }),
    ...(typeof s.opacity === 'number' &&
      s.opacity >= 0.1 &&
      s.opacity <= 1 && { opacity: s.opacity }),
    ...(s.theme === 'light' || s.theme === 'dark' || s.theme === 'system'
      ? { theme: s.theme }
      : {}),
    ...(typeof s.accent === 'string' && s.accent.length < 80 && {
      accent: s.accent,
    }),
    ...(typeof s.fontFamily === 'string' &&
      s.fontFamily.length < 400 && { fontFamily: s.fontFamily }),
    ...(typeof s.fontSizePx === 'number' &&
      s.fontSizePx >= 10 &&
      s.fontSizePx <= 36 && { fontSizePx: s.fontSizePx }),
    ...(typeof s.lineHeight === 'number' &&
      s.lineHeight >= 1 &&
      s.lineHeight <= 2.5 && { lineHeight: s.lineHeight }),
    ...(s.density === 'compact' || s.density === 'comfortable'
      ? { density: s.density }
      : {}),
    ...(typeof s.textOpacity === 'number' &&
      s.textOpacity >= 0.2 &&
      s.textOpacity <= 1 && { textOpacity: s.textOpacity }),
    ...(typeof s.bgOpacity === 'number' &&
      s.bgOpacity >= 0.1 &&
      s.bgOpacity <= 1 && { bgOpacity: s.bgOpacity }),
    ...(typeof s.chromeDimUntilHover === 'boolean' && {
      chromeDimUntilHover: s.chromeDimUntilHover,
    }),
    ...(typeof s.chromeDimStrength === 'number' &&
      s.chromeDimStrength >= 0.12 &&
      s.chromeDimStrength <= 0.85 && {
        chromeDimStrength: s.chromeDimStrength,
      }),
    ...(typeof s.sortMode === 'string' &&
      SORT_MODES.includes(s.sortMode as SortMode) && {
        sortMode: s.sortMode as SortMode,
      }),
    ...(typeof s.showCompletedArchive === 'boolean' && {
      showCompletedArchive: s.showCompletedArchive,
    }),
    ...(typeof s.launchAtLogin === 'boolean' && {
      launchAtLogin: s.launchAtLogin,
    }),
    ...(s.globalShortcut === null ||
    (typeof s.globalShortcut === 'string' && s.globalShortcut.length < 120)
      ? { globalShortcut: s.globalShortcut as string | null }
      : {}),
    ...(isObject(s.windowBounds) &&
      typeof (s.windowBounds as { x?: unknown }).x === 'number' &&
      typeof (s.windowBounds as { y?: unknown }).y === 'number' &&
      typeof (s.windowBounds as { width?: unknown }).width === 'number' &&
      typeof (s.windowBounds as { height?: unknown }).height === 'number' && {
        windowBounds: s.windowBounds as AppSettings['windowBounds'],
      }),
    ...(typeof s.displayId === 'number' && { displayId: s.displayId }),
  }
}

function isLikelyDoc(v: unknown): v is JSONContent {
  return isObject(v) && v.type === 'doc'
}

/**
 * Returns normalized AppData, or null if the root JSON is not an object.
 */
export function parseAndValidateAppData(raw: unknown): AppData | null {
  if (!isObject(raw)) {
    return null
  }

  const docRaw = raw.doc
  const doc = normalizeChecklistDoc(
    docRaw !== undefined && docRaw !== null && isLikelyDoc(docRaw)
      ? docRaw
      : emptyDoc(),
  )

  const settings = coerceSettings(raw.settings)

  return {
    version: DATA_VERSION,
    doc,
    settings,
  }
}
