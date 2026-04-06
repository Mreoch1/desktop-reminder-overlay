import type { JSONContent } from '@tiptap/core'
import { emptyDoc } from './defaultDoc'

function ensureTaskItemAttrs(
  item: JSONContent,
  fallbackCreatedAt: number,
): JSONContent {
  const attrs = (item.attrs ?? {}) as Record<string, unknown>
  return {
    ...item,
    type: 'taskItem',
    attrs: {
      checked: Boolean(attrs.checked),
      urgent: Boolean(attrs.urgent),
      createdAt:
        typeof attrs.createdAt === 'number' ? attrs.createdAt : fallbackCreatedAt,
    },
  }
}

/**
 * Coerce stored JSON into `doc > taskList > taskItem+` so the checklist-only schema accepts it.
 */
export function normalizeChecklistDoc(doc: JSONContent): JSONContent {
  if (doc.type !== 'doc' || !doc.content?.length) {
    return emptyDoc()
  }

  const items: JSONContent[] = []
  const now = Date.now()

  for (const block of doc.content) {
    if (block.type === 'taskList' && block.content) {
      for (const item of block.content) {
        if (item.type === 'taskItem') {
          items.push(ensureTaskItemAttrs(item, now))
        }
      }
    } else if (block.type === 'paragraph') {
      items.push({
        type: 'taskItem',
        attrs: {
          checked: false,
          urgent: false,
          createdAt: now,
        },
        content: [block],
      })
    } else {
      items.push({
        type: 'taskItem',
        attrs: {
          checked: false,
          urgent: false,
          createdAt: now,
        },
        content: [
          {
            type: 'paragraph',
            content: block.content ?? [],
          },
        ],
      })
    }
  }

  if (items.length === 0) {
    return emptyDoc()
  }

  return {
    type: 'doc',
    content: [
      {
        type: 'taskList',
        content: items,
      },
    ],
  }
}
