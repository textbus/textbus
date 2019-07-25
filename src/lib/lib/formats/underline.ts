import { ButtonHandler } from '../toolbar/toolbar';
import { Editor } from '../editor/editor';

export const underlineHandler: ButtonHandler = {
  type: 'button',
  format: 'icon-italic',
  tooltip: '斜体',
  tags: ['EM', 'I'],
  handler(editor: Editor): void {
    editor.contentDocument.execCommand('underline');
  }
};
