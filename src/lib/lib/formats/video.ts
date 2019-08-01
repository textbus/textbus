import { ButtonHandler } from '../toolbar/help';
import { Editor } from '../editor/editor';

export const videoHandler: ButtonHandler = {
  type: 'button',
  classes: ['tanbo-editor-icon-video'],
  tooltip: '视频',
  tags: ['VIDEO'],
  execCommand(editor: Editor): void {
    // editor.contentDocument.execCommand('italic');
  }
};
