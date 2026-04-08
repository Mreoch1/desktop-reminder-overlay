import { contextBridge, ipcRenderer } from 'electron'
import type { AppData } from '../src/shared/types'

type SaveResult = { ok: true } | { ok: false; error: string }

const api = {
  minimize: (): Promise<void> => ipcRenderer.invoke('window:minimize'),
  toggleMaximize: (): Promise<boolean> =>
    ipcRenderer.invoke('window:toggleMaximize'),
  close: (): Promise<void> => ipcRenderer.invoke('window:close'),

  setAlwaysOnTop: (value: boolean): Promise<void> =>
    ipcRenderer.invoke('window:setAlwaysOnTop', value),
  setOpacity: (value: number): Promise<void> =>
    ipcRenderer.invoke('window:setOpacity', value),

  getBounds: (): Promise<{
    x: number
    y: number
    width: number
    height: number
  } | null> => ipcRenderer.invoke('window:getBounds'),
  setBounds: (bounds: {
    x: number
    y: number
    width: number
    height: number
  }): Promise<void> => ipcRenderer.invoke('window:setBounds', bounds),

  getAppVersion: (): Promise<string> => ipcRenderer.invoke('app:getVersion'),
  getPaths: (): Promise<{ userData: string }> =>
    ipcRenderer.invoke('app:getPaths'),

  loadData: (): Promise<AppData> => ipcRenderer.invoke('data:load'),
  saveData: (data: AppData): Promise<SaveResult> =>
    ipcRenderer.invoke('data:save', data),

  exportData: (): Promise<{
    canceled: boolean
    path?: string
    error?: string
  }> => ipcRenderer.invoke('dialog:export'),
  importData: (): Promise<{
    canceled: boolean
    data?: AppData
    error?: string
  }> => ipcRenderer.invoke('dialog:import'),

  setLaunchAtLogin: (open: boolean): Promise<void> =>
    ipcRenderer.invoke('app:setLaunchAtLogin', open),
  getLaunchAtLogin: (): Promise<boolean> =>
    ipcRenderer.invoke('app:getLaunchAtLogin'),

  registerGlobalShortcut: (
    accelerator: string | null,
  ): Promise<{ ok: boolean; reason?: string }> =>
    ipcRenderer.invoke('shortcut:register', accelerator),

  onShortcut: (callback: () => void): (() => void) => {
    const handler = (): void => {
      callback()
    }
    ipcRenderer.on('shortcut:triggered', handler)
    return () => {
      ipcRenderer.removeListener('shortcut:triggered', handler)
    }
  },

  onBoundsCommit: (callback: () => void): (() => void) => {
    const handler = (): void => {
      callback()
    }
    ipcRenderer.on('window:bounds-changed', handler)
    return () => {
      ipcRenderer.removeListener('window:bounds-changed', handler)
    }
  },

  onWindowHoverChanged: (callback: (hovered: boolean) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, hovered: boolean): void => {
      callback(hovered)
    }
    ipcRenderer.on('window:hover-changed', handler)
    return () => {
      ipcRenderer.removeListener('window:hover-changed', handler)
    }
  },
}

contextBridge.exposeInMainWorld('deskOverlay', api)
