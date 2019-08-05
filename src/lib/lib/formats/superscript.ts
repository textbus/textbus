import { ButtonHandler } from '../toolbar/help';
import { Editor } from '../editor/editor';

export const superscriptHandler: ButtonHandler = {
  type: 'button',
  classes: ['tanbo-editor-icon-superscript'],
  tooltip: '上标',
  match: {
    tags: ['SUP']
  },
  execCommand(editor: Editor): void {
    editor.contentDocument.execCommand('superscript');
  }
};
