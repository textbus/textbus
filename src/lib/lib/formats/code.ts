import { ButtonHandler } from '../toolbar/help';
import { Editor } from '../editor/editor';

export const codeHandler: ButtonHandler = {
  type: 'button',
  classes: ['tanbo-editor-icon-code'],
  tooltip: '代码',
  match: {
    tags: ['PRE']
  },
  execCommand(editor: Editor): void {
    editor.format({
      useTagName: 'pre'
    });
  }
};
