import { Extension } from '@tiptap/core'
import { clearTaskLineFormatting } from './clearTaskLineFormatting'

/**
 * Mod-Shift-C: strip bold, highlight, and color from the current task line.
 */
export const ClearLineFormattingShortcut = Extension.create({
  name: 'clearLineFormattingShortcut',

  addKeyboardShortcuts() {
    return {
      'Mod-Shift-c': () => clearTaskLineFormatting(this.editor),
    }
  },
})
