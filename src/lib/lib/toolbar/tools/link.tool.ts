import { LinkCommander } from '../commands/link.commander';
import { Form } from '../forms/form';
import { AttrType } from '../forms/help';
import { FormatMatcher } from '../matcher/format.matcher';
import { linkFormatter } from '../../formatter/link.formatter';
import { FormatEffect } from '../../core/formatter';
import { DropdownHandler } from '../toolkit/dropdown.handler';
import { Toolkit } from '../toolkit/toolkit';

export const linkTool = Toolkit.makeDropdownTool({
  classes: ['tbus-icon-link'],
  tooltip: '链接',
  menuFactory() {
    return new Form([{
      type: AttrType.TextField,
      label: '跳转链接地址',
      name: 'href',
      required: true,
      placeholder: '请输入链接地址'
    }, {
      type: AttrType.Options,
      label: '跳转方式',
      name: 'target',
      required: true,
      values: [{
        label: '当前窗口',
        value: '_self',
        default: true
      }, {
        label: '新窗口',
        value: '_blank'
      }]
    }]);
  },
  contextMenu: [{
    label: '编辑',
    displayNeedMatch: true,
    action(renderer, selection, tool) {
      (<DropdownHandler>tool).expand(true);
    }
  }, {
    label: '删除',
    displayNeedMatch: true,
    action(renderer, selection) {
      selection.firstRange.getSelectedScope().forEach(scope => {
        scope.fragment.getFormatRangesByFormatter(linkFormatter).forEach(format => {
          if (format.startIndex <= scope.startIndex && format.endIndex >= scope.endIndex) {
            scope.fragment.mergeFormat({
              ...format,
              state: FormatEffect.Invalid
            });
          }
        });
      })
    }
  }],
  match: new FormatMatcher(linkFormatter),
  execCommand() {
    return new LinkCommander(linkFormatter)
  }
});
