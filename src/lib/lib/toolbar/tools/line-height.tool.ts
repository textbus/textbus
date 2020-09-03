import { FormatMatcher } from '../matcher/format.matcher';
import { lineHeightFormatter } from '../../formatter/style.formatter';
import { StyleCommander } from '../commands/style.commander';
import { FormatAbstractData } from '../../core/format-abstract-data';
import { SelectToolConfig, Toolkit } from '../toolkit/_api';
import { PreComponent } from '../../components/pre.component';

export const lineHeightToolConfig: SelectToolConfig = {
  tooltip: '行高',
  iconClasses: ['textbus-icon-line-height'],
  mini: true,
  options: [{
    label: '1x',
    classes: ['textbus-toolbar-line-height-1'],
    value: '1em',
    default: true
  }, {
    label: '1.2x',
    classes: ['textbus-toolbar-line-height-1_2'],
    value: '1.2em'
  }, {
    label: '1.4x',
    classes: ['textbus-toolbar-line-height-1_4'],
    value: '1.4em'
  }, {
    label: '1.6x',
    classes: ['textbus-toolbar-line-height-1_6'],
    value: '1.6em'
  }, {
    label: '1.8x',
    classes: ['textbus-toolbar-line-height-1_8'],
    value: '1.8em'
  }, {
    label: '2x',
    classes: ['textbus-toolbar-line-height-2'],
    value: '2em'
  }, {
    label: '3x',
    classes: ['textbus-toolbar-line-height-3'],
    value: '3em'
  }, {
    label: '4x',
    classes: ['textbus-toolbar-line-height-4'],
    value: '4em'
  }],
  matcher: new FormatMatcher(lineHeightFormatter, [PreComponent]),
  highlight(options, data) {
    if (data instanceof FormatAbstractData) {
      for (const option of options) {
        if (option.value === data.styles.get('lineHeight')) {
          return option;
        }
      }
    }
  },
  commanderFactory() {
    return new StyleCommander('lineHeight', lineHeightFormatter);
  }
};
export const lineHeightTool = Toolkit.makeSelectTool(lineHeightToolConfig);
