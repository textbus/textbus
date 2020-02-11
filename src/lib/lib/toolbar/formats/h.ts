import { HandlerType, Priority, SelectConfig } from '../help';
import { BlockCommander } from '../../commands/block-commander';

export const hHandler: SelectConfig = {
  type: HandlerType.Select,
  tooltip: '标题',
  priority: Priority.Block,
  execCommand: new BlockCommander('p'),
  styleSheets: [`
  body {
    font-size: 14px;
    padding: 8px;
    margin: 0;
    }
  p { 
    margin-top: 5px; 
    margin-bottom: 5px; 
  }`],
  highlight(options, abstractData) {
    for (const option of options) {
      if (option.value === abstractData.tag) {
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
    classes: ['tbus-toolbar-h1'],
    value: 'h1',
    keymap: {
      ctrlKey: true,
      key: '1'
    }
  }, {
    label: '标题2',
    classes: ['tbus-toolbar-h2'],
    value: 'h2',
    keymap: {
      ctrlKey: true,
      key: '2'
    }
  }, {
    label: '标题3',
    classes: ['tbus-toolbar-h3'],
    value: 'h3',
    keymap: {
      ctrlKey: true,
      key: '3'
    }
  }, {
    label: '标题4',
    classes: ['tbus-toolbar-h4'],
    value: 'h4',
    keymap: {
      ctrlKey: true,
      key: '4'
    }
  }, {
    label: '标题5',
    classes: ['tbus-toolbar-h5'],
    value: 'h5',
    keymap: {
      ctrlKey: true,
      key: '5'
    }
  }, {
    label: '标题6',
    classes: ['tbus-toolbar-h6'],
    value: 'h6',
    keymap: {
      ctrlKey: true,
      key: '6'
    }
  }, {
    label: '正文',
    value: 'p',
    default: true,
    keymap: {
      ctrlKey: true,
      key: '0'
    }
  }]
};
