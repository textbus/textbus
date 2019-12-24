import { HandlerType, Priority, SelectConfig } from '../help';
import { BlockCommander } from '../../commands/block-commander';

export const hHandler: SelectConfig = {
  type: HandlerType.Select,
  tooltip: '标题',
  priority: Priority.Block,
  execCommand: new BlockCommander('p'),
  highlight(options, cacheData) {
    for (const option of options) {
      if (option.value === cacheData.tag) {
        return option;
      }
    }
  },
  editable: {
    tag: true
  },
  match: {
    tags: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p'],
    noInTags: ['pre']
  },
  options: [{
    label: '标题1',
    classes: ['tanbo-editor-toolbar-h1'],
    value: 'h1'
  }, {
    label: '标题2',
    classes: ['tanbo-editor-toolbar-h2'],
    value: 'h2'
  }, {
    label: '标题3',
    classes: ['tanbo-editor-toolbar-h3'],
    value: 'h3'
  }, {
    label: '标题4',
    classes: ['tanbo-editor-toolbar-h4'],
    value: 'h4'
  }, {
    label: '标题5',
    classes: ['tanbo-editor-toolbar-h5'],
    value: 'h5'
  }, {
    label: '标题6',
    classes: ['tanbo-editor-toolbar-h6'],
    value: 'h6'
  }, {
    label: '正文',
    value: 'p',
    default: true
  }]
};
