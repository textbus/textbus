import { HandlerType, SelectConfig } from '../help';
import { BlockCommander } from '../commands/block.commander';
import { BlockTemplate } from '../../templates/block.template';
import { BlockMatcher } from '../matcher/block.matcher';

export const headingTool: SelectConfig = {
  type: HandlerType.Select,
  match: new BlockMatcher(BlockTemplate),
  highlight(options, p) {
    console.log(p);
    return options[0]
  },
  execCommand: new BlockCommander('p'),
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
