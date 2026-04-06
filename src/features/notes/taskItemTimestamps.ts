import { Extension } from '@tiptap/core'
import { Fragment } from '@tiptap/pm/model'
import type { Node as PMNode, NodeType } from '@tiptap/pm/model'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import type { Transaction } from '@tiptap/pm/state'

export const taskItemTimestampsKey = new PluginKey('taskItemTimestamps')

/**
 * Within each task list, move urgent task items to the top (stable order within
 * urgent and non-urgent groups).
 */
function reorderUrgentTaskItemsToTop(
  tr: Transaction,
  doc: PMNode,
  taskListType: NodeType,
  taskItemType: NodeType,
): Transaction {
  const lists: { pos: number; node: PMNode }[] = []
  doc.descendants((node, pos) => {
    if (node.type === taskListType) {
      lists.push({ pos, node })
    }
  })
  lists.sort((a, b) => b.pos - a.pos)

  let out = tr
  for (const { pos, node } of lists) {
    const children: PMNode[] = []
    node.forEach((child) => {
      children.push(child)
    })
    const urgent: PMNode[] = []
    const rest: PMNode[] = []
    for (const c of children) {
      if (c.type === taskItemType && c.attrs.urgent === true) {
        urgent.push(c)
      } else {
        rest.push(c)
      }
    }
    const reordered = [...urgent, ...rest]
    let changed = false
    for (let i = 0; i < children.length; i++) {
      if (children[i] !== reordered[i]) {
        changed = true
        break
      }
    }
    if (!changed) continue

    const from = pos + 1
    const to = pos + node.nodeSize - 1
    out = out.replaceWith(from, to, Fragment.fromArray(reordered))
  }
  return out
}

/**
 * Ensures every task item has a unique createdAt (ms). New lines from Enter split
 * get a fresh time via keepOnSplit: false on createdAt; this fills nulls and fixes
 * rare duplicate timestamps (e.g. imports).
 */
export const TaskItemTimestamps = Extension.create({
  name: 'taskItemTimestamps',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: taskItemTimestampsKey,
        appendTransaction(transactions, _oldState, newState) {
          if (!transactions.some((t) => t.docChanged)) {
            return null
          }
          const taskItem = newState.schema.nodes.taskItem
          const taskList = newState.schema.nodes.taskList
          if (!taskItem || !taskList) {
            return null
          }

          const items: { pos: number; node: import('@tiptap/pm/model').Node }[] = []
          newState.doc.descendants((node, pos) => {
            if (node.type === taskItem) {
              items.push({ pos, node })
            }
          })

          let tr = newState.tr
          let prevFinal: number | null = null

          for (let i = 0; i < items.length; i++) {
            const { pos, node } = items[i]
            const attrs = { ...node.attrs } as Record<string, unknown>
            if (attrs.createdAt == null) {
              attrs.createdAt = Date.now() + i
            }
            let cur = attrs.createdAt as number
            if (i > 0 && prevFinal !== null && cur === prevFinal) {
              attrs.createdAt = Date.now() + 10_000 + i
              cur = attrs.createdAt as number
            }
            prevFinal = cur

            if (JSON.stringify(attrs) === JSON.stringify(node.attrs)) {
              continue
            }
            tr = tr.setNodeMarkup(pos, taskItem, attrs)
          }

          tr = reorderUrgentTaskItemsToTop(tr, tr.doc, taskList, taskItem)

          return tr.steps.length > 0 ? tr : null
        },
      }),
    ]
  },
})
