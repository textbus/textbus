import { FormatMatcher } from '../matcher/format.matcher';
import { textIndentFormatter } from '../../formatter/block-style.formatter';
import { BlockStyleCommander } from '../commands/block-style.commander';
import { FormatData } from '../../core/format-data';
import { SelectToolConfig, Toolkit } from '../toolkit/_api';
import { PreComponent } from '../../components/pre.component';

export const textIndentToolConfig: SelectToolConfig = {
  tooltip: '首行缩进',
  iconClasses: ['textbus-icon-text-indent'],
  mini: true,
  options: [{
    label: '0x',
    value: '0',
    classes: ['textbus-toolbar-text-indent-0'],
    default: true
  }, {
    label: '1x',
    value: '1em',
    classes: ['textbus-toolbar-text-indent-1'],
    default: true
  }, {
    label: '2x',
    classes: ['textbus-toolbar-text-indent-2'],
    value: '2em',
  }, {
    label: '4x',
    classes: ['textbus-toolbar-text-indent-4'],
    value: '4em'
  }],
  matcher: new FormatMatcher(textIndentFormatter, [PreComponent]),
  matchOption(data) {
    if (data instanceof FormatData) {
      for (const option of textIndentToolConfig.options) {
        if (option.value === data.styles.get('textIndent')) {
          return option;
        }
      }
    }
  },
  commanderFactory() {
    return new BlockStyleCommander('textIndent', textIndentFormatter);
  }
};
export const textIndentTool = Toolkit.makeSelectTool(textIndentToolConfig);
