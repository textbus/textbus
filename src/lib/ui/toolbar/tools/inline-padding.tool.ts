import { Form, FormTextField } from '../../uikit/forms/_api';
import { FormatMatcher } from '../matcher/format.matcher';
import { DropdownTool, DropdownToolConfig } from '../toolkit/_api';
import { PreComponent } from '../../../components/pre.component';
import { inlinePaddingFormatter } from '../../../formatter/padding.formatter';
import { InlinePaddingCommander } from '../commands/inline-padding.commander';

export const inlinePaddingToolConfig: DropdownToolConfig = {
  // iconClasses: ['textbus-icon-link'],
  label: '行内边距',
  tooltip: '行内边距',
  menuFactory() {
    return new Form({
      mini: true,
      editProperty: 'styles',
      items: [
        new FormTextField({
          label: '上边距',
          name: 'paddingTop',
          placeholder: '请输入上边距'
        }),
        new FormTextField({
          label: '右边距',
          name: 'paddingRight',
          placeholder: '请输入右边距'
        }),
        new FormTextField({
          label: '下边距',
          name: 'paddingBottom',
          placeholder: '请输入下边距'
        }),
        new FormTextField({
          label: '左边距',
          name: 'paddingLeft',
          placeholder: '请输入左边距'
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
