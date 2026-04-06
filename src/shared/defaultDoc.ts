import type { JSONContent } from '@tiptap/core'

/** Initial TipTap document: one empty checklist item. */
export function emptyDoc(): JSONContent {
  return {
    type: 'doc',
    content: [
      {
        type: 'taskList',
        content: [
          {
            type: 'taskItem',
            attrs: {
              checked: false,
              urgent: false,
              createdAt: Date.now(),
            },
            content: [{ type: 'paragraph' }],
          },
        ],
      },
    ],
  }
}
