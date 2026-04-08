import TaskItem from '@tiptap/extension-task-item'
import { getRenderedAttributes } from '@tiptap/core'
import { Fragment } from '@tiptap/pm/model'
import type { Node as PMNode } from '@tiptap/pm/model'
import { formatTaskTimestamp } from './taskTimestamp'

export const CustomTaskItem = TaskItem.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      urgent: {
        default: false,
        keepOnSplit: false,
        parseHTML: (element) =>
          element.getAttribute('data-urgent') === 'true',
        renderHTML: (attributes) => {
          if (!attributes.urgent) {
            return {}
          }
          return {
            'data-urgent': 'true',
            class: 'task-item--urgent',
          }
        },
      },
      createdAt: {
        default: null as number | null,
        keepOnSplit: false,
        parseHTML: (element) => {
          const v = element.getAttribute('data-created-at')
          if (!v) return null
          const n = parseInt(v, 10)
          return Number.isFinite(n) ? n : null
        },
        renderHTML: (attributes) => {
          if (attributes.createdAt == null) return {}
          return { 'data-created-at': String(attributes.createdAt) }
        },
      },
    }
  },

  addNodeView() {
    return ({ node, HTMLAttributes, getPos, editor }) => {
      const listItem = document.createElement('li')
      const checkboxWrapper = document.createElement('label')
      const checkboxStyler = document.createElement('span')
      const checkbox = document.createElement('input')
      const content = document.createElement('div')
      content.className = 'task-item__content'
      const endRow = document.createElement('div')
      endRow.className = 'task-item__end'
      endRow.contentEditable = 'false'
      const deleteBtn = document.createElement('button')
      deleteBtn.type = 'button'
      deleteBtn.className = 'task-item__delete'
      deleteBtn.setAttribute('aria-label', 'Delete line')
      deleteBtn.setAttribute('title', 'Delete line')
      deleteBtn.contentEditable = 'false'
      deleteBtn.innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false"><path fill="currentColor" d="M6 2h4a1 1 0 0 1 1 1v1h3v1H2V4h3V3a1 1 0 0 1 1-1zm-1 4v5h1V6H5zm4 0v5h1V6H9z"/></svg>'
      const stamp = document.createElement('time')
      stamp.className = 'task-item__stamp'
      stamp.setAttribute('aria-hidden', 'true')

      const syncStamp = (current: typeof node): void => {
        const ms = current.attrs.createdAt as number | null | undefined
        if (ms == null || !Number.isFinite(ms)) {
          stamp.textContent = ''
          stamp.removeAttribute('datetime')
          stamp.hidden = true
        } else {
          stamp.hidden = false
          stamp.dateTime = new Date(ms).toISOString()
          stamp.textContent = formatTaskTimestamp(ms)
        }
      }
      syncStamp(node)

      const updateA11Y = (currentNode: typeof node): void => {
        const a11y = this.options.a11y as
          | { checkboxLabel?: (n: typeof node, checked: boolean) => string }
          | undefined
        checkbox.ariaLabel =
          a11y?.checkboxLabel?.(currentNode, checkbox.checked) ??
          `Task item checkbox for ${currentNode.textContent || 'empty task item'}`
      }
      updateA11Y(node)
      checkboxWrapper.contentEditable = 'false'
      checkbox.type = 'checkbox'
      checkbox.addEventListener('mousedown', (event) => event.preventDefault())
      const runDeleteLine = (): void => {
        if (!editor.isEditable || typeof getPos !== 'function') return
        const pos = getPos()
        if (typeof pos !== 'number') return
        void editor
          .chain()
          .focus(undefined, { scrollIntoView: false })
          .command(({ tr, state }) => {
            const taskNode = state.doc.nodeAt(pos)
            if (!taskNode || taskNode.type.name !== 'taskItem') {
              return false
            }
            const $in = state.doc.resolve(pos + 1)
            let list = null as PMNode | null
            for (let d = $in.depth; d >= 0; d--) {
              const n = $in.node(d)
              if (n.type.name === 'taskList') {
                list = n
                break
              }
            }
            if (!list) {
              return false
            }
            if (list.childCount === 1) {
              const paragraph = state.schema.nodes.paragraph
              const taskItemType = state.schema.nodes.taskItem
              if (!paragraph || !taskItemType) return false
              const emptyItem = taskItemType.create(
                {
                  checked: false,
                  urgent: false,
                  createdAt: Date.now(),
                },
                Fragment.from(paragraph.create()),
              )
              tr.replaceWith(pos, pos + taskNode.nodeSize, emptyItem)
            } else {
              tr.delete(pos, pos + taskNode.nodeSize)
            }
            return true
          })
          .run()
      }

      deleteBtn.addEventListener('mousedown', (e) => {
        e.preventDefault()
        e.stopPropagation()
      })
      deleteBtn.addEventListener('click', (e) => {
        e.preventDefault()
        e.stopPropagation()
        runDeleteLine()
      })

      checkbox.addEventListener('change', (event) => {
        if (!editor.isEditable && !this.options.onReadOnlyChecked) {
          checkbox.checked = !checkbox.checked
          return
        }
        const target = event.target
        if (!(target instanceof HTMLInputElement)) return
        const { checked } = target
        if (editor.isEditable && typeof getPos === 'function') {
          void editor
            .chain()
            .focus(undefined, { scrollIntoView: false })
            .command(({ tr }) => {
              const position = getPos()
              if (typeof position !== 'number') {
                return false
              }
              const currentNode = tr.doc.nodeAt(position)
              tr.setNodeMarkup(position, undefined, {
                ...(currentNode ? currentNode.attrs : {}),
                checked,
              })
              return true
            })
            .run()
        }
        if (!editor.isEditable && this.options.onReadOnlyChecked) {
          if (!this.options.onReadOnlyChecked(node, checked)) {
            checkbox.checked = !checkbox.checked
          }
        }
      })
      Object.entries(
        this.options.HTMLAttributes as Record<string, string>,
      ).forEach(([key, value]) => {
        listItem.setAttribute(key, value)
      })
      listItem.dataset.checked = String(node.attrs.checked)
      checkbox.checked = node.attrs.checked
      checkboxWrapper.append(checkbox, checkboxStyler)
      deleteBtn.hidden = !editor.isEditable
      deleteBtn.tabIndex = editor.isEditable ? 0 : -1
      endRow.append(stamp, deleteBtn)
      listItem.append(checkboxWrapper, content, endRow)
      Object.entries(HTMLAttributes).forEach(([key, value]) => {
        listItem.setAttribute(key, value)
      })
      let prevRenderedAttributeKeys = new Set(Object.keys(HTMLAttributes))
      return {
        dom: listItem,
        contentDOM: content,
        update: (updatedNode) => {
          if (updatedNode.type !== this.type) {
            return false
          }
          listItem.dataset.checked = String(updatedNode.attrs.checked)
          checkbox.checked = updatedNode.attrs.checked
          deleteBtn.hidden = !editor.isEditable
          deleteBtn.tabIndex = editor.isEditable ? 0 : -1
          updateA11Y(updatedNode)
          syncStamp(updatedNode)
          const extensionAttributes = editor.extensionManager.attributes
          const newHTMLAttributes = getRenderedAttributes(
            updatedNode,
            extensionAttributes,
          )
          const newKeys = new Set(Object.keys(newHTMLAttributes))
          const staticAttrs = this.options.HTMLAttributes as Record<
            string,
            string
          >
          prevRenderedAttributeKeys.forEach((key) => {
            if (!newKeys.has(key)) {
              if (key in staticAttrs) {
                listItem.setAttribute(key, staticAttrs[key]!)
              } else {
                listItem.removeAttribute(key)
              }
            }
          })
          Object.entries(newHTMLAttributes).forEach(([key, value]) => {
            if (value === null || value === undefined) {
              if (key in staticAttrs) {
                listItem.setAttribute(key, staticAttrs[key]!)
              } else {
                listItem.removeAttribute(key)
              }
            } else {
              listItem.setAttribute(key, value)
            }
          })
          prevRenderedAttributeKeys = newKeys
          return true
        },
      }
    }
  },
})
