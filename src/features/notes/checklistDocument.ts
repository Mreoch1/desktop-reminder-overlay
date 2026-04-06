import Document from '@tiptap/extension-document'

/**
 * Root document may only contain a single task list, so every block-level line is a task item
 * with a checkbox (Enter splits task items instead of creating top-level paragraphs).
 */
export const ChecklistDocument = Document.extend({
  content: 'taskList',
})
