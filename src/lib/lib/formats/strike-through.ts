import { ButtonHandler } from '../toolbar/help';
import { Editor } from '../editor/editor';

export const strikeThroughHandler: ButtonHandler = {
  type: 'button',
  format: 'tanbo-editor-icon-strikethrough',
  tooltip: '删除线',
  tags: ['STRIKE', 'DEL', 'S'],
  execCommand(editor: Editor): void {
    editor.contentDocument.execCommand('strikeThrough');
  }
};
