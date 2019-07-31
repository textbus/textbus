import { SelectHandler, SelectHandlerOption } from '../toolbar/help';
import { Editor } from '../editor/editor';

export const hHandler: SelectHandler = {
  type: 'select',
  format: null,
  options: [{
    label: '标题1',
    tags: ['H1'],
    format: 'tanbo-editor-toolbar-dropdown-menu-item-h1'
  }, {
    label: '标题2',
    tags: ['H2'],
    format: 'tanbo-editor-toolbar-dropdown-menu-item-h2'
  }, {
    label: '标题3',
    tags: ['H3'],
    format: 'tanbo-editor-toolbar-dropdown-menu-item-h3'
  }, {
    label: '标题4',
    tags: ['H4'],
    format: 'tanbo-editor-toolbar-dropdown-menu-item-h4'
  }, {
    label: '标题5',
    tags: ['H5'],
    format: 'tanbo-editor-toolbar-dropdown-menu-item-h5'
  }, {
    label: '标题6',
    tags: ['H6'],
    format: 'tanbo-editor-toolbar-dropdown-menu-item-h6'
  }, {
    label: '正文',
    tags: ['P'],
    normal: true
  }],
  execCommand(option: SelectHandlerOption, editor: Editor): void {
    editor.contentDocument.execCommand('formatBlock', false, option.tags[0].toLowerCase());
  }
};
