import type { Editor } from '@tiptap/core'
import type { JSONContent } from '@tiptap/core'
import type { SortMode } from '../../shared/types'

function textPreview(node: JSONContent): string {
  if (!node.content) return ''
  let s = ''
  for (const c of node.content) {
    if (c.type === 'text' && c.text) {
      s += c.text
    } else if (c.content) {
      s += textPreview(c)
    }
  }
  return s.trim().toLowerCase()
}

export function sortTaskListContent(
  docJson: JSONContent,
  mode: SortMode,
): JSONContent {
  if (!docJson.content?.length) return docJson

  const out = { ...docJson, content: [...docJson.content] }

  for (let i = 0; i < out.content!.length; i++) {
    const block = out.content![i]
    if (block.type !== 'taskList' || !block.content?.length) continue

    const items = [...block.content]
    if (mode === 'manual') {
      continue
    }

    const enriched = items.map((item, index) => ({
      item,
      index,
      urgent: !!(item.attrs && (item.attrs as { urgent?: boolean }).urgent),
      createdAt: (item.attrs as { createdAt?: number | null })?.createdAt ?? 0,
      alpha: textPreview(item),
    }))

    if (mode === 'urgentFirst') {
      enriched.sort((a, b) => {
        if (a.urgent !== b.urgent) return a.urgent ? -1 : 1
        return a.index - b.index
      })
    } else if (mode === 'alpha') {
      enriched.sort((a, b) => a.alpha.localeCompare(b.alpha))
    } else if (mode === 'created') {
      enriched.sort((a, b) => a.createdAt - b.createdAt)
    }

    out.content![i] = {
      ...block,
      content: enriched.map((e) => e.item),
    }
  }

  return out
}

export function runSort(editor: Editor, mode: SortMode): void {
  if (mode === 'manual') return
  const json = editor.getJSON()
  const sorted = sortTaskListContent(json, mode)
  editor.commands.setContent(sorted, { emitUpdate: false })
}
