import { HandlerType, SelectHandler } from '../toolbar/help';
import { BlockFormatter } from '../toolbar/block-formatter';

export const hHandler: SelectHandler = {
  type: HandlerType.Select,
  tooltip: '标题',
  options: [{
    label: '标题1',
    match: {tags: ['H1']},
    classes: ['tanbo-editor-toolbar-dropdown-menu-item-h1'],
    execCommand: new BlockFormatter('h1')
  }, {
    label: '标题2',
    match: {tags: ['H2']},
    classes: ['tanbo-editor-toolbar-dropdown-menu-item-h2'],
    execCommand: new BlockFormatter('h2')
  }, {
    label: '标题3',
    match: {tags: ['H3']},
    classes: ['tanbo-editor-toolbar-dropdown-menu-item-h3'],
    execCommand: new BlockFormatter('h3')
  }, {
    label: '标题4',
    match: {tags: ['H4']},
    classes: ['tanbo-editor-toolbar-dropdown-menu-item-h4'],
    execCommand: new BlockFormatter('h4')
  }, {
    label: '标题5',
    match: {tags: ['H5']},
    classes: ['tanbo-editor-toolbar-dropdown-menu-item-h5'],
    execCommand: new BlockFormatter('h5')
  }, {
    label: '标题6',
    match: {tags: ['H6']},
    classes: ['tanbo-editor-toolbar-dropdown-menu-item-h6'],
    execCommand: new BlockFormatter('h6')
  }, {
    label: '正文',
    match: {tags: ['P']},
    execCommand: new BlockFormatter('p'),
    default: true
  }]
};
