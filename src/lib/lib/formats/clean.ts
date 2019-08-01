import { ButtonHandler } from '../toolbar/help';
import { Editor } from '../editor/editor';

export const cleanHandler: ButtonHandler = {
  type: 'button',
  classes: ['tanbo-editor-icon-clean'],
  tooltip: '清除格式',
  tags: [],
  execCommand(editor: Editor): void {
    // editor.contentDocument.execCommand('bold');
  }
};
