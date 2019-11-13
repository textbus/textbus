import { blockHandlerPriority, HandlerType, SelectConfig } from '../help';
import { BlockCommander } from '../../commands/block-commander';

export const hHandler: SelectConfig = {
  type: HandlerType.Select,
  tooltip: '标题',
  priority: blockHandlerPriority,
  execCommand: new BlockCommander('p'),
  options: [{
    label: '标题1',
    match: {tags: ['h1']},
    classes: ['tanbo-editor-toolbar-h1'],
    value: 'h1'
  }, {
    label: '标题2',
    match: {tags: ['h2']},
    classes: ['tanbo-editor-toolbar-h2'],
    value: 'h2'
  }, {
    label: '标题3',
    match: {tags: ['h3']},
    classes: ['tanbo-editor-toolbar-h3'],
    value: 'h3'
  }, {
    label: '标题4',
    match: {tags: ['h4']},
    classes: ['tanbo-editor-toolbar-h4'],
    value: 'h4'
  }, {
    label: '标题5',
    match: {tags: ['h5']},
    classes: ['tanbo-editor-toolbar-h5'],
    value: 'h5'
  }, {
    label: '标题6',
    match: {tags: ['h6']},
    classes: ['tanbo-editor-toolbar-h6'],
    value: 'h6'
  }, {
    label: '正文',
    match: {tags: ['p']},
    value: 'p',
    default: true
  }]
};
