import { FormatMatcher } from '../matcher/format.matcher';
import { textIndentFormatter } from '../../formatter/block-style.formatter';
import { BlockStyleCommander } from '../commands/block-style.commander';
import { FormatAbstractData } from '../../core/format-abstract-data';
import { Toolkit } from '../toolkit/toolkit';
import { PreTemplate } from '../../templates/pre.template';

export const textIndentTool = Toolkit.makeSelectTool({
  tooltip: '首行缩进',
  classes: ['tbus-icon-text-indent'],
  mini: true,
  options: [{
    label: '0x',
    value: '0',
    classes: ['tbus-text-indent-0'],
    default: true
  }, {
    label: '1x',
    value: '1em',
    classes: ['tbus-text-indent-1'],
    default: true
  }, {
    label: '2x',
    classes: ['tbus-text-indent-2'],
    value: '2em',
  }, {
    label: '4x',
    classes: ['tbus-text-indent-4'],
    value: '4em'
  }],
  matcher: new FormatMatcher(textIndentFormatter, [PreTemplate]),
  highlight(options, data) {
    if (data instanceof FormatAbstractData) {
      for (const option of options) {
        if (option.value === data.style.value) {
          return option;
        }
      }
    }
  },
  commanderFactory() {
    return new BlockStyleCommander('textIndent', textIndentFormatter);
  }
});
