import { ButtonHandler } from '../toolbar/toolbar';
import { Editor } from '../editor/editor';

export const underlineHandler: ButtonHandler = {
  type: 'button',
  format: 'icon-underline',
  tooltip: '下划线',
  tags: ['U'],
  handler(editor: Editor): void {
    editor.contentDocument.execCommand('underline');
  }
};
