import { ButtonHandler } from '../toolbar/help';
import { Editor } from '../editor/editor';

export const boldHandler: ButtonHandler = {
  type: 'button',
  classes: ['tanbo-editor-icon-bold'],
  tooltip: '加粗',
  tags: ['STRONG', 'B'],
  execCommand(editor: Editor): void {
    editor.contentDocument.execCommand('bold');
  }
};
