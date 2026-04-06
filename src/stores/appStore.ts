import { create } from 'zustand'
import type { JSONContent } from '@tiptap/core'
import type { AppData, AppSettings } from '../shared/types'
import { DATA_VERSION, defaultSettings } from '../shared/types'
import { emptyDoc } from '../shared/defaultDoc'

type AppState = {
  ready: boolean
  data: AppData
  docVersion: number
  setReady: (v: boolean) => void
  setData: (data: AppData) => void
  patchSettings: (partial: Partial<AppSettings>) => void
  setDoc: (doc: JSONContent) => void
  bumpDocVersion: () => void
}

export const useAppStore = create<AppState>((set) => ({
  ready: false,
  data: {
    version: DATA_VERSION,
    doc: emptyDoc(),
    settings: defaultSettings(),
  },
  docVersion: 0,

  setReady: (v) => set({ ready: v }),

  setData: (data) => set({ data }),

  patchSettings: (partial) =>
    set((s) => ({
      data: { ...s.data, settings: { ...s.data.settings, ...partial } },
    })),

  setDoc: (doc) =>
    set((s) => ({
      data: { ...s.data, doc },
    })),

  bumpDocVersion: () => set((s) => ({ docVersion: s.docVersion + 1 })),
}))
