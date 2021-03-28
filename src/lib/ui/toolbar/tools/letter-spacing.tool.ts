import { FormatMatcher } from '../matcher/format.matcher';
import { letterSpacingFormatter } from '../../../formatter/style.formatter';
import { StyleCommander } from '../commands/style.commander';
import { FormatData } from '../../../core/format-data';
import { SelectTool, SelectToolConfig } from '../toolkit/_api';
import { PreComponent } from '../../../components/pre.component';

export const letterSpacingToolConfig: SelectToolConfig = {
  tooltip: '字间距',
  iconClasses: ['textbus-icon-letter-spacing'],
  mini: true,
  options: [{
    label: '默认',
    value: '',
    classes: ['textbus-toolbar-letter-spacing-inherit'],
    default: true
  }, {
    label: '0px',
    value: '0px',
    classes: ['textbus-toolbar-letter-spacing-0'],
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
  matchOption(data) {
    if (data instanceof FormatData) {
      for (const option of letterSpacingToolConfig.options) {
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
export const letterSpacingTool = new SelectTool(letterSpacingToolConfig);
