import { HandlerType, SelectConfig } from '../help';
import { FormatMatcher } from '../matcher/format.matcher';
import { textAlignFormatter } from '../../formatter/block-style.formatter';
import { BlockStyleCommander } from '../commands/block-style.commander';

export const textAlignTool: SelectConfig = {
  type: HandlerType.Select,
  tooltip: '对齐方式',
  options: [{
    label: '左对齐',
    classes: ['tbus-icon-paragraph-left'],
    value: 'left',
    keymap: {
      ctrlKey: true,
      key: 'l'
    },
    default: true
  }, {
    label: '右对齐',
    classes: ['tbus-icon-paragraph-right'],
    value: 'right',
    keymap: {
      ctrlKey: true,
      key: 'r'
    },
  }, {
    label: '居中对齐',
    classes: ['tbus-icon-paragraph-center'],
    value: 'center',
    keymap: {
      ctrlKey: true,
      key: 'e'
    },
  }, {
    label: '分散对齐',
    classes: ['tbus-icon-paragraph-justify'],
    value: 'justify',
    keymap: {
      ctrlKey: true,
      key: 'j'
    },
  }],
  match: new FormatMatcher(textAlignFormatter),
  highlight(options, p) {
    console.log(p);
    return options[0]
  },
  execCommand: new BlockStyleCommander('textAlign', textAlignFormatter)
};
