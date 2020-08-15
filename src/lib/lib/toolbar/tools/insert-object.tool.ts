import { Toolkit } from '../toolkit/toolkit';
import { GroupConfig, MenuType } from '../toolkit/group.handler';
import { preToolConfig } from './pre.tool';
import { subscriptToolConfig } from './subscript.tool';
import { superscriptToolConfig } from './superscript.tool';
import { leftToRightToolConfig } from './left-to-right.tool';
import { rightToLeftToolConfig } from './right-to-left.tool';
import { audioToolConfig } from './audio.tool';
import { videoToolConfig } from './video.tool';
import { emojiToolConfig } from './emoji.tool';
import { lineHeightToolConfig } from './line-height.tool';
import { letterSpacingToolConfig } from './letter-spacing.tool';
import { blockBackgroundToolConfig } from './block-background.tool';
import { codeToolConfig } from './code.tool';
import { blockquoteToolConfig } from './blockquote.tool';

export const insertObjectToolConfig: GroupConfig = {
  iconClasses: ['textbus-icon-plus'],
  menu: [{
    ...preToolConfig,
    type: MenuType.Select,
    label: '源代码'
  }, {
    ...audioToolConfig,
    type: MenuType.Dropdown,
    label: '音频'
  }, {
    ...videoToolConfig,
    type: MenuType.Dropdown,
    label: '视频'
  }, {
    ...lineHeightToolConfig,
    type: MenuType.Select,
    label: '行高'
  }, {
    ...letterSpacingToolConfig,
    type: MenuType.Select,
    label: '字间距'
  }, {
    ...blockBackgroundToolConfig,
    type: MenuType.Dropdown,
    label: '区块背景颜色'
  }, {
    ...emojiToolConfig,
    type: MenuType.Dropdown,
    label: '表情'
  }, {
    ...subscriptToolConfig,
    type: MenuType.Action,
    label: '下标'
  }, {
    ...superscriptToolConfig,
    type: MenuType.Action,
    label: '上标'
  }, {
    ...codeToolConfig,
    type: MenuType.Action,
    label: 'Code'
  }, {
    ...blockquoteToolConfig,
    type: MenuType.Action,
    label: '引用'
  }, {
    ...leftToRightToolConfig,
    type: MenuType.Action,
    label: '从左向右'
  }, {
    ...rightToLeftToolConfig,
    type: MenuType.Action,
    label: '从右向左'
  }]
}
export const insertObjectTool = Toolkit.makeGroupTool(insertObjectToolConfig);
