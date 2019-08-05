import { ButtonHandler } from '../toolbar/help';
import { Editor } from '../editor/editor';

export const underlineHandler: ButtonHandler = {
  type: 'button',
  classes: ['tanbo-editor-icon-underline'],
  tooltip: '下划线',
  match: {
    tags: ['U']
  },
  execCommand(editor: Editor): void {
    editor.contentDocument.execCommand('underline');
  }
};
