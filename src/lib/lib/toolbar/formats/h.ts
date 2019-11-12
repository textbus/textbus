import { blockHandlerPriority, HandlerType, SelectConfig } from '../help';
import { BlockCommander } from '../../commands/block-commander';

export const hHandler: SelectConfig = {
  type: HandlerType.Select,
  tooltip: '标题',
  options: [{
    label: '标题1',
    match: {tags: ['h1']},
    priority: blockHandlerPriority,
    classes: ['tanbo-editor-toolbar-h1'],
    execCommand: new BlockCommander('h1')
  }, {
    label: '标题2',
    match: {tags: ['h2']},
    priority: blockHandlerPriority,
    classes: ['tanbo-editor-toolbar-h2'],
    execCommand: new BlockCommander('h2')
  }, {
    label: '标题3',
    match: {tags: ['h3']},
    priority: blockHandlerPriority,
    classes: ['tanbo-editor-toolbar-h3'],
    execCommand: new BlockCommander('h3')
  }, {
    label: '标题4',
    match: {tags: ['h4']},
    priority: blockHandlerPriority,
    classes: ['tanbo-editor-toolbar-h4'],
    execCommand: new BlockCommander('h4')
  }, {
    label: '标题5',
    match: {tags: ['h5']},
    priority: blockHandlerPriority,
    classes: ['tanbo-editor-toolbar-h5'],
    execCommand: new BlockCommander('h5')
  }, {
    label: '标题6',
    match: {tags: ['h6']},
    priority: blockHandlerPriority,
    classes: ['tanbo-editor-toolbar-h6'],
    execCommand: new BlockCommander('h6')
  }, {
    label: '正文',
    match: {tags: ['p']},
    priority: blockHandlerPriority,
    execCommand: new BlockCommander('p'),
    default: true
  }]
};
