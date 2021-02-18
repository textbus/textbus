import { FormatMatcher } from '../matcher/format.matcher';
import { fontSizeFormatter } from '../../formatter/style.formatter';
import { StyleCommander } from '../commands/style.commander';
import { FormatData } from '../../core/format-data';
import { SelectToolConfig, Toolkit } from '../toolkit/_api';
import { PreComponent } from '../../components/pre.component';

export const fontSizeToolConfig: SelectToolConfig = {
  tooltip: '字体大小',
  iconClasses: ['textbus-icon-font-size'],
  mini: true,
  options: [{
    label: '12px',
    classes: ['textbus-toolbar-font-size-12'],
    value: '12px'
  }, {
    label: '13px',
    classes: ['textbus-toolbar-font-size-13'],
    value: '13px'
  }, {
    label: '14px',
    classes: ['textbus-toolbar-font-size-14'],
    value: '14px'
  }, {
    label: '15px',
    classes: ['textbus-toolbar-font-size-15'],
    value: '15px',
  }, {
    label: '16px',
    classes: ['textbus-toolbar-font-size-16'],
    value: '16px',
    default: true
  }, {
    label: '18px',
    classes: ['textbus-toolbar-font-size-18'],
    value: '18px'
  }, {
    label: '20px',
    classes: ['textbus-toolbar-font-size-20'],
    value: '20px'
  }, {
    label: '24px',
    classes: ['textbus-toolbar-font-size-24'],
    value: '24px'
  }, {
    label: '36px',
    classes: ['textbus-toolbar-font-size-36'],
    value: '36px'
  }, {
    label: '48px',
    classes: ['textbus-toolbar-font-size-48'],
    value: '48px'
  }],
  matcher: new FormatMatcher(fontSizeFormatter, [PreComponent]),
  matchOption(data) {
    if (data instanceof FormatData) {
      for (const option of fontSizeToolConfig.options) {
        if (option.value === data.styles.get('fontSize')) {
          return option;
        }
      }
    }
  },
  commanderFactory() {
    return new StyleCommander('fontSize', fontSizeFormatter);
  }
};
export const fontSizeTool = Toolkit.makeSelectTool(fontSizeToolConfig);
