import { FormatMatcher } from '../matcher/format.matcher';
import { FormatData } from '../../../core/format-data';
import { SelectTool, SelectToolConfig } from '../toolkit/_api';
import { PreComponent } from '../../../components/pre.component';
import { VerticalAlignCommander } from '../commands/vertical-align.commander';
import { verticalAlignFormatter } from '../../../formatter/vertical-align.formatter';

export const verticalAlignToolConfig: SelectToolConfig = {
  tooltip: '垂直对齐方式',
  // iconClasses: ['textbus-icon-font-size'],
  mini: true,
  options: [{
    label: '基线对齐',
    value: 'baseline',
    default: true
  }, {
    label: '文本上标',
    value: 'super'
  }, {
    label: '文本下标',
    value: 'sub'
  }, {
    label: '顶端对齐',
    value: 'top'
  }, {
    label: '居中',
    value: 'middle'
  }, {
    label: '底端对齐',
    value: 'bottom'
  }, {
    label: '字体顶端对齐',
    value: 'text-top'
  }, {
    label: '字体底端对齐',
    value: 'text-bottom'
  }],
  matcher: new FormatMatcher(verticalAlignFormatter, [PreComponent]),
  matchOption(data) {
    if (data instanceof FormatData) {
      for (const option of verticalAlignToolConfig.options) {
        if (option.value === data.styles.get('verticalAlign')) {
          return option;
        }
      }
    }
  },
  commanderFactory() {
    return new VerticalAlignCommander(verticalAlignFormatter);
  }
};
export const verticalAlignTool = new SelectTool(verticalAlignToolConfig);
