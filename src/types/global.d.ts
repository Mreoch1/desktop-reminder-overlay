import type { AppData } from '../shared/types'

export {}

type SaveResult = { ok: true } | { ok: false; error: string }

declare global {
  interface Window {
    deskOverlay: {
      minimize: () => Promise<void>
      toggleMaximize: () => Promise<boolean>
      close: () => Promise<void>
      setAlwaysOnTop: (value: boolean) => Promise<void>
      setOpacity: (value: number) => Promise<void>
      getBounds: () => Promise<{
        x: number
        y: number
        width: number
        height: number
      } | null>
      setBounds: (bounds: {
        x: number
        y: number
        width: number
        height: number
      }) => Promise<void>
      getAppVersion: () => Promise<string>
      getPaths: () => Promise<{ userData: string }>
      loadData: () => Promise<AppData>
      saveData: (data: AppData) => Promise<SaveResult>
      exportData: () => Promise<{
        canceled: boolean
        path?: string
        error?: string
      }>
      importData: () => Promise<{
        canceled: boolean
        data?: AppData
        error?: string
      }>
      setLaunchAtLogin: (open: boolean) => Promise<void>
      getLaunchAtLogin: () => Promise<boolean>
      registerGlobalShortcut: (
        accelerator: string | null,
      ) => Promise<{ ok: boolean; reason?: string }>
      onShortcut: (callback: () => void) => () => void
      onBoundsCommit: (callback: () => void) => () => void
      onWindowHoverChanged: (callback: (hovered: boolean) => void) => () => void
    }
  }
}
