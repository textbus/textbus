import { Form, FormTextField } from '@textbus/uikit';
import { PreComponent } from '@textbus/components';
import { inlinePaddingFormatter } from '@textbus/formatters';

import { FormatMatcher } from '../matcher/format.matcher';
import { DropdownTool, DropdownToolConfig } from '../toolkit/_api';
import { InlinePaddingCommander } from '../commands/inline-padding.commander';

export const inlinePaddingToolConfig: DropdownToolConfig = {
  label: i18n => i18n.get('plugins.toolbar.inlinePaddingTool.label'),
  tooltip: i18n => i18n.get('plugins.toolbar.inlinePaddingTool.tooltip'),
  viewFactory(i18n) {
    const childI18n = i18n.getContext('plugins.toolbar.inlinePaddingTool.view')
    return new Form({
      mini: true,
      editProperty: 'styles',
      cancelBtnText: childI18n.get('cancelBtnText'),
      confirmBtnText: childI18n.get('confirmBtnText'),
      items: [
        new FormTextField({
          label: childI18n.get('topLabel'),
          name: 'paddingTop',
          placeholder: childI18n.get('topPlaceholder')
        }),
        new FormTextField({
          label: childI18n.get('rightLabel'),
          name: 'paddingRight',
          placeholder: childI18n.get('rightPlaceholder')
        }),
        new FormTextField({
          label: childI18n.get('bottomLabel'),
          name: 'paddingBottom',
          placeholder: childI18n.get('bottomPlaceholder')
        }),
        new FormTextField({
          label: childI18n.get('leftLabel'),
          name: 'paddingLeft',
          placeholder: childI18n.get('leftPlaceholder')
        }),
      ]
    });
  },
  matcher: new FormatMatcher(inlinePaddingFormatter, [PreComponent]),
  commanderFactory() {
    return new InlinePaddingCommander(inlinePaddingFormatter)
  }
};
export const inlinePaddingTool = new DropdownTool(inlinePaddingToolConfig);
