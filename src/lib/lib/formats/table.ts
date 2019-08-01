import { ButtonHandler } from '../toolbar/help';
import { Editor } from '../editor/editor';

export const tableHandler: ButtonHandler = {
  type: 'button',
  classes: ['tanbo-editor-icon-table'],
  tooltip: '视频',
  tags: ['TABLE'],
  execCommand(editor: Editor): void {
    // editor.contentDocument.execCommand('italic');
  }
};
