import { HandlerType, SelectConfig } from '../help';
import { FormatMatcher } from '../matcher/format.matcher';
import { lineHeightFormatter } from '../../formatter/style.formatter';
import { StyleCommander } from '../commands/style.commander';

export const lineHeightTool: SelectConfig = {
  type: HandlerType.Select,
  tooltip: '行高',
  classes: ['tbus-icon-line-height'],
  mini: true,
  options: [{
    label: '1x',
    classes: ['tbus-line-height-1'],
    value: '1em',
    default: true
  }, {
    label: '1.2x',
    classes: ['tbus-line-height-1_2'],
    value: '1.2em'
  }, {
    label: '1.4x',
    classes: ['tbus-line-height-1_4'],
    value: '1.4em'
  }, {
    label: '1.6x',
    classes: ['tbus-line-height-1_6'],
    value: '1.6em'
  }, {
    label: '1.8x',
    classes: ['tbus-line-height-1_8'],
    value: '1.8em'
  }, {
    label: '2x',
    classes: ['tbus-line-height-2'],
    value: '2em'
  }, {
    label: '3x',
    classes: ['tbus-line-height-3'],
    value: '3em'
  }, {
    label: '4x',
    classes: ['tbus-line-height-4'],
    value: '4em'
  }],
  match: new FormatMatcher(lineHeightFormatter),
  highlight(options, p) {
    console.log(p);
    return options[0]
  },
  execCommand: new StyleCommander('lineHeight', lineHeightFormatter)
};
