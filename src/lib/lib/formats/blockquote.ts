import { ButtonHandler } from '../toolbar/help';
import { Editor } from '../editor/editor';

export const blockquoteHandler: ButtonHandler = {
  type: 'button',
  format: 'tanbo-editor-icon-quotes-right',
  tooltip: '引用',
  tags: ['BLOCKQUOTE'],
  execCommand(editor: Editor): void {
    editor.contentDocument.execCommand('formatBlock', false, 'blockquote');
  }
};
