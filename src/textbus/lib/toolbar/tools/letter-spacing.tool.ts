import { FormatMatcher } from '../matcher/format.matcher';
import { letterSpacingFormatter } from '../../formatter/style.formatter';
import { StyleCommander } from '../commands/style.commander';
import { FormatAbstractData } from '../../core/format-abstract-data';
import { SelectToolConfig, Toolkit } from '../toolkit/_api';
import { PreComponent } from '../../components/pre.component';

export const letterSpacingToolConfig: SelectToolConfig = {
  tooltip: '字间距',
  iconClasses: ['textbus-icon-letter-spacing'],
  mini: true,
  options: [{
    label: '0px',
    value: '0px',
    classes: ['textbus-toolbar-letter-spacing-0'],
    default: true
  }, {
    label: '1px',
    classes: ['textbus-toolbar-letter-spacing-1'],
    value: '1px',
  }, {
    label: '2px',
    classes: ['textbus-toolbar-letter-spacing-2'],
    value: '2px',
  }, {
    label: '3px',
    classes: ['textbus-toolbar-letter-spacing-3'],
    value: '3px',
  }, {
    label: '4px',
    classes: ['textbus-toolbar-letter-spacing-4'],
    value: '4px',
  }, {
    label: '5px',
    classes: ['textbus-toolbar-letter-spacing-5'],
    value: '5px',
  }],
  matcher: new FormatMatcher(letterSpacingFormatter, [PreComponent]),
  highlight(options, data) {
    if (data instanceof FormatAbstractData) {
      for (const option of options) {
        if (option.value === data.styles.get('letterSpacing')) {
          return option;
        }
      }
    }
  },
  commanderFactory() {
    return new StyleCommander('letterSpacing', letterSpacingFormatter);
  }
};
export const letterSpacingTool = Toolkit.makeSelectTool(letterSpacingToolConfig);
