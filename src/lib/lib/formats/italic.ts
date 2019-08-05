import { ButtonHandler } from '../toolbar/help';
import { Editor } from '../editor/editor';

export const italicHandler: ButtonHandler = {
  type: 'button',
  classes: ['tanbo-editor-icon-italic'],
  tooltip: '斜体',
  match: {
    tags: ['EM', 'I']
  },
  execCommand(editor: Editor): void {
    editor.contentDocument.execCommand('italic');
  }
};
