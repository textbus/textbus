import { SelectHandler, SelectHandlerOption } from '../toolbar/help';
import { Editor } from '../editor/editor';

export const hHandler: SelectHandler = {
  type: 'select',
  tooltip: '标题',
  options: [{
    label: '标题1',
    tags: ['H1'],
    classes: ['tanbo-editor-toolbar-dropdown-menu-item-h1']
  }, {
    label: '标题2',
    tags: ['H2'],
    classes: ['tanbo-editor-toolbar-dropdown-menu-item-h2']
  }, {
    label: '标题3',
    tags: ['H3'],
    classes: ['tanbo-editor-toolbar-dropdown-menu-item-h3']
  }, {
    label: '标题4',
    tags: ['H4'],
    classes: ['tanbo-editor-toolbar-dropdown-menu-item-h4']
  }, {
    label: '标题5',
    tags: ['H5'],
    classes: ['tanbo-editor-toolbar-dropdown-menu-item-h5']
  }, {
    label: '标题6',
    tags: ['H6'],
    classes: ['tanbo-editor-toolbar-dropdown-menu-item-h6']
  }, {
    label: '正文',
    tags: ['P'],
    default: true
  }],
  execCommand(option: SelectHandlerOption, editor: Editor): void {
    editor.format({
      useTagName: option.tags[0].toLowerCase()
    });
  }
};
