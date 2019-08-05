import { ButtonHandler } from '../toolbar/help';
import { Editor } from '../editor/editor';

export const imageHandler: ButtonHandler = {
  type: 'button',
  classes: ['tanbo-editor-icon-image'],
  tooltip: '图片',
  match: {
    tags: ['IMG']
  },
  execCommand(editor: Editor): void {
    // editor.contentDocument.execCommand('italic');
  }
};
