import { FormatMatcher } from '../matcher/format.matcher';
import { textAlignFormatter } from '../../../formatter/block-style.formatter';
import { BlockStyleCommander } from '../commands/block-style.commander';
import { FormatData } from '../../../core/format-data';
import { SelectToolConfig, Toolkit } from '../toolkit/_api';
import { PreComponent } from '../../../components/pre.component';

export const textAlignToolConfig: SelectToolConfig = {
  tooltip: '对齐方式',
  options: [{
    label: '左对齐',
    iconClasses: ['textbus-icon-paragraph-left'],
    value: 'left',
    keymap: {
      ctrlKey: true,
      key: 'l'
    },
    default: true
  }, {
    label: '右对齐',
    iconClasses: ['textbus-icon-paragraph-right'],
    value: 'right',
    keymap: {
      ctrlKey: true,
      key: 'r'
    },
  }, {
    label: '居中对齐',
    iconClasses: ['textbus-icon-paragraph-center'],
    value: 'center',
    keymap: {
      ctrlKey: true,
      key: 'e'
    },
  }, {
    label: '分散对齐',
    iconClasses: ['textbus-icon-paragraph-justify'],
    value: 'justify',
    keymap: {
      ctrlKey: true,
      key: 'j'
    },
  }],
  matcher: new FormatMatcher(textAlignFormatter, [PreComponent]),
  matchOption(data) {
    if (data instanceof FormatData) {
      for (const option of textAlignToolConfig.options) {
        if (option.value === data.styles.get('textAlign')) {
          return option;
        }
      }
    }
  },
  commanderFactory() {
    return new BlockStyleCommander('textAlign', textAlignFormatter);
  }
};
export const textAlignTool = Toolkit.makeSelectTool(textAlignToolConfig);
