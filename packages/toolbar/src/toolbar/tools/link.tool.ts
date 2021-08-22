import { Form, FormRadio, FormTextField } from '@textbus/uikit';
import { linkFormatter } from '@textbus/formatters';
import { PreComponent } from '@textbus/components';

import { LinkCommander } from '../commands/link.commander';
import { FormatMatcher } from '../matcher/format.matcher';
import { DropdownTool, DropdownToolConfig } from '../toolkit/_api';

export const linkToolConfig: DropdownToolConfig = {
  iconClasses: ['textbus-icon-link'],
  tooltip: i18n => i18n.get('plugins.toolbar.linkTool.tooltip'),
  viewFactory(i18n) {
    const childI18n = i18n.getContext('plugins.toolbar.linkTool.view');
    return new Form({
      mini: true,
      items: [
        new FormTextField({
          label: childI18n.get('linkLabel'),
          name: 'href',
          placeholder: childI18n.get('linkInputPlaceholder'),
          validateFn(value: any): string {
            const a = document.createElement('a')
            a.href = value
            if (a.hostname) {
              return null
            }
            return childI18n.get('invalidMessage')
          }
        }),
        new FormRadio({
          label: childI18n.get('jumpLabel'),
          name: 'target',
          values: [{
            label: childI18n.get('jumpSelfLabel'),
            value: '_self',
            default: true
          }, {
            label: childI18n.get('jumpBlankLabel'),
            value: '_blank'
          }]
        })
      ]
    });
  },
  matcher: new FormatMatcher(linkFormatter, [PreComponent]),
  commanderFactory() {
    return new LinkCommander(linkFormatter)
  }
};
export const linkTool = new DropdownTool(linkToolConfig);
