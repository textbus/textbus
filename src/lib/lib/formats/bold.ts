import { ButtonHandler } from '../toolbar/toolbar';
import { Editor } from '../editor/editor';

export const boldHandler: ButtonHandler = {
  type: 'button',
  format: 'icon-bold',
  tooltip: '加粗',
  tags: ['STRONG', 'B'],
  handler(editor: Editor): void {
    editor.contentDocument.execCommand('bold');
  }
};
