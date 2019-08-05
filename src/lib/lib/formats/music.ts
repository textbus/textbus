import { ButtonHandler } from '../toolbar/help';
import { Editor } from '../editor/editor';

export const musicHandler: ButtonHandler = {
  type: 'button',
  classes: ['tanbo-editor-icon-music'],
  tooltip: '音乐',
  match: {
    tags: ['AUDIO']
  },
  execCommand(editor: Editor): void {
    // editor.contentDocument.execCommand('italic');
  }
};
