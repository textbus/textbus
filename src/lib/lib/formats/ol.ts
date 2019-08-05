import { ButtonHandler } from '../toolbar/help';
import { Editor } from '../editor/editor';

export const olHandler: ButtonHandler = {
  type: 'button',
  classes: ['tanbo-editor-icon-list-numbered'],
  tooltip: '有序列表',
  match: {
    tags: ['OL']
  },
  execCommand(editor: Editor): void {
    editor.contentDocument.execCommand('formatBlock', false, 'ol');
  }
};
