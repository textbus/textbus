import { LinkCommander } from '../commands/link.commander';
import { Form } from '../../uikit/forms/form';
import { FormType } from '../../uikit/forms/help';
import { FormatMatcher } from '../matcher/format.matcher';
import { linkFormatter } from '../../formatter/link.formatter';
import { Toolkit } from '../toolkit/toolkit';
import { PreComponent } from '../../components/pre.component';

export const linkToolConfig = {
  iconClasses: ['textbus-icon-link'],
  tooltip: '链接',
  menuFactory() {
    return new Form({
      mini: true,
      items: [{
        type: FormType.TextField,
        label: '跳转链接地址',
        name: 'href',
        placeholder: '请输入链接地址'
      }, {
        type: FormType.Radio,
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
      }]
    });
  },
  matcher: new FormatMatcher(linkFormatter, [PreComponent]),
  commanderFactory() {
    return new LinkCommander(linkFormatter)
  }
};
export const linkTool = Toolkit.makeDropdownTool(linkToolConfig);
