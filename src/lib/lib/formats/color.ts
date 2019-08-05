import { ButtonHandler } from '../toolbar/help';
import { Editor } from '../editor/editor';

export const colorHandler: ButtonHandler = {
  type: 'button',
  classes: ['tanbo-editor-icon-color'],
  tooltip: '引用',
  execCommand(editor: Editor): void {
    editor.contentDocument.execCommand('foreColor', false, '#0000ff');
  }
};
