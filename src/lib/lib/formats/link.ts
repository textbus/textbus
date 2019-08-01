import { ButtonHandler } from '../toolbar/help';
import { Editor } from '../editor/editor';

export const linkHandler: ButtonHandler = {
  type: 'button',
  classes: ['tanbo-editor-icon-link'],
  tooltip: '链接',
  tags: ['A'],
  execCommand(editor: Editor): void {
    // editor.contentDocument.execCommand('italic');
  }
};
