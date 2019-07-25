import { ButtonHandler } from '../toolbar/toolbar';
import { Editor } from '../editor/editor';

export const strikeThroughHandler: ButtonHandler = {
  type: 'button',
  format: 'icon-strikethrough',
  tooltip: '删除线',
  tags: ['STRIKE', 'DEL', 'S'],
  handler(editor: Editor): void {
    editor.contentDocument.execCommand('strikeThrough');
  }
};
