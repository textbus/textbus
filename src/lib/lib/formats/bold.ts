import { ButtonHandler } from '../toolbar/help';
import { Editor } from '../editor/editor';

export const boldHandler: ButtonHandler = {
  type: 'button',
  classes: ['tanbo-editor-icon-bold'],
  tooltip: '加粗',
  match: {
    tags: ['STRONG', 'B']
  },
  execCommand(editor: Editor): void {
    editor.format('strong');
    // editor.contentDocument.execCommand('bold');
  }
};
