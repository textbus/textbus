import { ButtonHandler } from '../toolbar/help';
import { Editor } from '../editor/editor';

export const backgroundHandler: ButtonHandler = {
  type: 'button',
  format: 'tanbo-editor-icon-background-color',
  tooltip: '引用',
  tags: [],
  execCommand(editor: Editor): void {
    editor.contentDocument.execCommand('backColor', false, '#ff0000');
  }
};
