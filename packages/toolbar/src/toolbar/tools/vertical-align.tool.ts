import { FormatData } from '@textbus/core';
import { PreComponent } from '@textbus/components';
import { verticalAlignFormatter } from '@textbus/formatters';

import { FormatMatcher } from '../matcher/format.matcher';
import { SelectTool, SelectToolConfig } from '../toolkit/_api';
import { VerticalAlignCommander } from '../commands/vertical-align.commander';

export const verticalAlignToolConfig: SelectToolConfig = {
  tooltip: i18n => i18n.get('plugins.toolbar.verticalAlignTool.tooltip'),
  mini: true,
  options: [{
    label: i18n => i18n.get('plugins.toolbar.verticalAlignTool.baseline'),
    value: 'baseline',
    default: true
  }, {
    label: i18n => i18n.get('plugins.toolbar.verticalAlignTool.super'),
    value: 'super'
  }, {
    label: i18n => i18n.get('plugins.toolbar.verticalAlignTool.sub'),
    value: 'sub'
  }, {
    label: i18n => i18n.get('plugins.toolbar.verticalAlignTool.top'),
    value: 'top'
  }, {
    label: i18n => i18n.get('plugins.toolbar.verticalAlignTool.middle'),
    value: 'middle'
  }, {
    label: i18n => i18n.get('plugins.toolbar.verticalAlignTool.bottom'),
    value: 'bottom'
  }, {
    label: i18n => i18n.get('plugins.toolbar.verticalAlignTool.textTop'),
    value: 'text-top'
  }, {
    label: i18n => i18n.get('plugins.toolbar.verticalAlignTool.textBottom'),
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
