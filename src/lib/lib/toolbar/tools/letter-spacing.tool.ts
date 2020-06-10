import { FormatMatcher } from '../matcher/format.matcher';
import { letterSpacingFormatter } from '../../formatter/style.formatter';
import { StyleCommander } from '../commands/style.commander';
import { FormatAbstractData } from '../../core/format-abstract-data';
import { Toolkit } from '../toolkit/toolkit';

export const letterSpacingTool = Toolkit.makeSelectTool({
  tooltip: '字间距',
  classes: ['tbus-icon-letter-spacing'],
  mini: true,
  options: [{
    label: '0px',
    value: '0px',
    classes: ['tbus-letter-spacing-0'],
    default: true
  }, {
    label: '1px',
    classes: ['tbus-letter-spacing-1'],
    value: '1px',
  }, {
    label: '2px',
    classes: ['tbus-letter-spacing-2'],
    value: '2px',
  }, {
    label: '3px',
    classes: ['tbus-letter-spacing-3'],
    value: '3px',
  }, {
    label: '4px',
    classes: ['tbus-letter-spacing-4'],
    value: '4px',
  }, {
    label: '5px',
    classes: ['tbus-letter-spacing-5'],
    value: '5px',
  }],
  matcher: new FormatMatcher(letterSpacingFormatter),
  highlight(options, data) {
    if (data instanceof FormatAbstractData) {
      for (const option of options) {
        if (option.value === data.style.value) {
          return option;
        }
      }
    }
  },
  execCommand() {
    return new StyleCommander('letterSpacing', letterSpacingFormatter);
  }
});
