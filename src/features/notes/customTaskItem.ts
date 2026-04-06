import TaskItem from '@tiptap/extension-task-item'
import { getRenderedAttributes } from '@tiptap/core'
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
      listItem.append(checkboxWrapper, content, stamp)
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
