import { ButtonHandler } from '../toolbar/help';
import { Editor } from '../editor/editor';

export const subscriptHandler: ButtonHandler = {
  type: 'button',
  format: 'tanbo-editor-icon-subscript',
  tooltip: '下标',
  tags: ['SUB'],
  execCommand(editor: Editor): void {
    editor.contentDocument.execCommand('subscript');
  }
};
