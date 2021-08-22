import { Form, FormTextField } from '@textbus/uikit';
import { PreComponent } from '@textbus/components';
import { inlineMarginFormatter } from '@textbus/formatters';

import { FormatMatcher } from '../matcher/format.matcher';
import { DropdownTool, DropdownToolConfig } from '../toolkit/_api';
import { InlineMarginCommander } from '../commands/inline-margin.commander';

export const inlineMarginToolConfig: DropdownToolConfig = {
  label: i18n => i18n.get('plugins.toolbar.inlineMarginTool.label'),
  tooltip: i18n => i18n.get('plugins.toolbar.inlineMarginTool.tooltip'),
  viewFactory(i18n) {
    const childI18n = i18n.getContext('plugins.toolbar.inlineMarginTool.view');
    return new Form({
      mini: true,
      editProperty: 'styles',
      cancelBtnText: childI18n.get('cancelBtnText'),
      confirmBtnText: childI18n.get('confirmBtnText'),
      items: [
        new FormTextField({
          label: childI18n.get('topLabel'),
          name: 'marginTop',
          placeholder: childI18n.get('topPlaceholder')
        }),
        new FormTextField({
          label: childI18n.get('rightLabel'),
          name: 'marginRight',
          placeholder: childI18n.get('rightPlaceholder')
        }),
        new FormTextField({
          label: childI18n.get('bottomLabel'),
          name: 'marginBottom',
          placeholder: childI18n.get('bottomPlaceholder')
        }),
        new FormTextField({
          label: childI18n.get('leftLabel'),
          name: 'marginLeft',
          placeholder: childI18n.get('leftPlaceholder')
        }),
      ]
    });
  },
  matcher: new FormatMatcher(inlineMarginFormatter, [PreComponent]),
  commanderFactory() {
    return new InlineMarginCommander(inlineMarginFormatter)
  }
};
export const inlineMarginTool = new DropdownTool(inlineMarginToolConfig);
