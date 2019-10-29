import { HandlerType, SelectHandlerOption } from '../toolbar/help';
import { BlockFormatter } from '../edit-frame/fomatter/block-formatter';

export const hHandler: SelectHandlerOption = {
  type: HandlerType.Select,
  tooltip: '标题',
  options: [{
    label: '标题1',
    match: {tags: ['h1']},
    classes: ['tanbo-editor-toolbar-h1'],
    execCommand: new BlockFormatter('h1')
  }, {
    label: '标题2',
    match: {tags: ['h2']},
    classes: ['tanbo-editor-toolbar-h2'],
    execCommand: new BlockFormatter('h2')
  }, {
    label: '标题3',
    match: {tags: ['h3']},
    classes: ['tanbo-editor-toolbar-h3'],
    execCommand: new BlockFormatter('h3')
  }, {
    label: '标题4',
    match: {tags: ['h4']},
    classes: ['tanbo-editor-toolbar-h4'],
    execCommand: new BlockFormatter('h4')
  }, {
    label: '标题5',
    match: {tags: ['h5']},
    classes: ['tanbo-editor-toolbar-h5'],
    execCommand: new BlockFormatter('h5')
  }, {
    label: '标题6',
    match: {tags: ['h6']},
    classes: ['tanbo-editor-toolbar-h6'],
    execCommand: new BlockFormatter('h6')
  }, {
    label: '正文',
    match: {tags: ['p']},
    execCommand: new BlockFormatter('p'),
    default: true
  }]
};
