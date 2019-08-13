import { ButtonHandler } from '../toolbar/help';
import { Editor } from '../editor/editor';

export const strikeThroughHandler: ButtonHandler = {
  type: 'button',
  classes: ['tanbo-editor-icon-strikethrough'],
  tooltip: '删除线',
  match: {
    tags: ['STRIKE', 'DEL', 'S']
  },
  execCommand(editor: Editor): void {
    editor.format({
      useTagName: 'del'
    });
  }
};
