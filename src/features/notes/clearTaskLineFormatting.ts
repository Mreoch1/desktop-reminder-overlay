import type { Editor } from '@tiptap/core'

/**
 * Removes bold, highlight, color, and other marks from the entire current task line
 * (the task item the cursor is in).
 */
export function clearTaskLineFormatting(editor: Editor): boolean {
  const { state } = editor
  const { $from } = state.selection

  for (let d = $from.depth; d > 0; d--) {
    if ($from.node(d).type.name !== 'taskItem') {
      continue
    }
    const taskItemNode = $from.node(d)
    const start = $from.before(d) + 1
    const end = start + taskItemNode.content.size
    if (start >= end) {
      return false
    }
    return editor
      .chain()
      .focus()
      .setTextSelection({ from: start, to: end })
      .unsetAllMarks()
      .run()
  }
  return false
}
