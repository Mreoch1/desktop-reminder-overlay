import { useEditor, EditorContent } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import StarterKit from '@tiptap/starter-kit'
import TaskList from '@tiptap/extension-task-list'
import Placeholder from '@tiptap/extension-placeholder'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import Highlight from '@tiptap/extension-highlight'
import BubbleMenuExtension from '@tiptap/extension-bubble-menu'
import { useEffect, useCallback, useRef } from 'react'
import type { JSONContent } from '@tiptap/core'
import { CustomTaskItem } from './customTaskItem'
import { ChecklistDocument } from './checklistDocument'
import { runSort } from './sortTasks'
import { normalizeChecklistDoc } from '../../shared/normalizeChecklistDoc'
import { TaskItemTimestamps } from './taskItemTimestamps'
import { clearTaskLineFormatting } from './clearTaskLineFormatting'
import { ClearLineFormattingShortcut } from './clearLineFormattingShortcut'
import type { SortMode } from '../../shared/types'
import './notesEditor.css'

type NotesEditorProps = {
  initialDoc: JSONContent | null
  docVersion: number
  sortMode: SortMode
  onDocChange: (doc: JSONContent) => void
}

const PRESET_COLORS = [
  '#0f172a',
  '#dc2626',
  '#ea580c',
  '#16a34a',
  '#2563eb',
  '#7c3aed',
]

export function NotesEditor({
  initialDoc,
  docVersion,
  sortMode,
  onDocChange,
}: NotesEditorProps) {
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevSortRef = useRef(sortMode)

  const debouncedSave = useCallback(
    (getJson: () => JSONContent) => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => {
        onDocChange(getJson())
      }, 400)
    },
    [onDocChange],
  )

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        document: false,
        trailingNode: false,
        listItem: false,
        listKeymap: false,
        heading: false,
        bulletList: false,
        orderedList: false,
        blockquote: false,
        codeBlock: false,
        horizontalRule: false,
      }),
      ChecklistDocument,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: false }),
      BubbleMenuExtension.configure({
        pluginKey: 'bubbleMenu',
      }),
      TaskList.configure({
        HTMLAttributes: { class: 'task-list' },
      }),
      CustomTaskItem.configure({
        nested: false,
        HTMLAttributes: { class: 'task-item' },
      }),
      TaskItemTimestamps,
      ClearLineFormattingShortcut,
      Placeholder.configure({
        placeholder: 'Tasks for today. Press Enter to add another line.',
      }),
    ],
    content: initialDoc ? normalizeChecklistDoc(initialDoc) : undefined,
    editorProps: {
      attributes: {
        class: 'notes-editor',
        spellcheck: 'true',
      },
    },
    onUpdate: ({ editor }) => {
      debouncedSave(() => editor.getJSON())
    },
  })

  // Re-apply document when `docVersion` changes (import), not when `initialDoc` updates on each save.
  useEffect(() => {
    if (!editor || !initialDoc) return
    editor.commands.setContent(normalizeChecklistDoc(initialDoc), {
      emitUpdate: false,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- docVersion-only reload
  }, [editor, docVersion])

  useEffect(() => {
    if (!editor) return
    if (prevSortRef.current === sortMode) return
    prevSortRef.current = sortMode
    runSort(editor, sortMode)
  }, [editor, sortMode])

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [])

  if (!editor) {
    return <div className="notes-editor notes-editor--loading">Loading…</div>
  }

  return (
    <div className="notes-editor-wrap">
      <div className="notes-toolbar" role="toolbar" aria-label="Formatting">
        <button
          type="button"
          className={`notes-toolbar__btn ${editor.isActive('bold') ? 'is-active' : ''}`}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          Bold
        </button>
        <button
          type="button"
          className={`notes-toolbar__btn ${editor.isActive('highlight') ? 'is-active' : ''}`}
          onClick={() => editor.chain().focus().toggleHighlight().run()}
        >
          Highlight
        </button>
        <span className="notes-toolbar__label">Color</span>
        {PRESET_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            className="notes-toolbar__swatch"
            style={{ background: c }}
            title={c}
            onClick={() => editor.chain().focus().setColor(c).run()}
          />
        ))}
        <button
          type="button"
          className="notes-toolbar__btn"
          onClick={() => editor.chain().focus().unsetColor().run()}
        >
          Default
        </button>
        <button
          type="button"
          className="notes-toolbar__btn"
          title="Remove bold, highlight, and color from this line (Ctrl+Shift+C or Cmd+Shift+C)"
          onClick={() => clearTaskLineFormatting(editor)}
        >
          Plain line
        </button>
        <button
          type="button"
          className="notes-toolbar__btn"
          onClick={() =>
            editor.chain().focus().updateAttributes('taskItem', {
              urgent: true,
              createdAt: Date.now(),
            }).run()
          }
        >
          Mark line urgent
        </button>
        <button
          type="button"
          className="notes-toolbar__btn"
          onClick={() =>
            editor.chain().focus().updateAttributes('taskItem', {
              urgent: false,
            }).run()
          }
        >
          Clear urgent
        </button>
      </div>

      <BubbleMenu editor={editor} className="notes-bubble">
        <button
          type="button"
          className="notes-bubble__btn"
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          B
        </button>
        <button
          type="button"
          className="notes-bubble__btn"
          onClick={() => editor.chain().focus().toggleHighlight().run()}
        >
          Hi
        </button>
        <button
          type="button"
          className="notes-bubble__btn"
          title="Plain line"
          onClick={() => clearTaskLineFormatting(editor)}
        >
          Plain
        </button>
      </BubbleMenu>

      <EditorContent editor={editor} />

    </div>
  )
}
