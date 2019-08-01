import { ButtonHandler } from '../toolbar/help';
import { Editor } from '../editor/editor';

export const ulHandler: ButtonHandler = {
  type: 'button',
  classes: ['tanbo-editor-icon-list'],
  tooltip: '无序列表',
  tags: ['UL'],
  execCommand(editor: Editor): void {
    editor.contentDocument.execCommand('formatBlock', false, 'ul');
  }
};
