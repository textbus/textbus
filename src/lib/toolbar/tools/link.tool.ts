import { LinkCommander } from '../commands/link.commander';
import { Form, FormRadio, FormTextField } from '../../uikit/forms/_api';
import { FormatMatcher } from '../matcher/format.matcher';
import { linkFormatter } from '../../formatter/link.formatter';
import { DropdownToolConfig, Toolkit } from '../toolkit/_api';
import { PreComponent } from '../../components/pre.component';

export const linkToolConfig: DropdownToolConfig = {
  iconClasses: ['textbus-icon-link'],
  tooltip: '链接',
  menuFactory() {
    return new Form({
      mini: true,
      items: [
        new FormTextField({
          label: '跳转链接地址',
          name: 'href',
          placeholder: '请输入链接地址'
        }),
        new FormRadio({
          label: '跳转方式',
          name: 'target',
          values: [{
            label: '当前窗口',
            value: '_self',
            default: true
          }, {
            label: '新窗口',
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
export const linkTool = Toolkit.makeDropdownTool(linkToolConfig);
