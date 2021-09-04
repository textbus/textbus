import { GroupConfig, MenuType, GroupTool } from '../toolkit/_api';
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
    label: i18n => i18n.get('plugins.toolbar.insertObjectTool.sourceCode')
  }, {
    ...lineHeightToolConfig,
    type: MenuType.Select,
    label: i18n => i18n.get('plugins.toolbar.insertObjectTool.lineHeight')
  }, {
    ...letterSpacingToolConfig,
    type: MenuType.Select,
    label: i18n => i18n.get('plugins.toolbar.insertObjectTool.letterSpacing')
  }, {
    ...blockBackgroundToolConfig,
    type: MenuType.Dropdown,
    label: i18n => i18n.get('plugins.toolbar.insertObjectTool.blockBackgroundColor')
  }, {
    ...emojiToolConfig,
    type: MenuType.Dropdown,
    label: i18n => i18n.get('plugins.toolbar.insertObjectTool.emoji')
  }, {
    ...audioToolConfig,
    type: MenuType.Form,
    label: i18n => i18n.get('plugins.toolbar.insertObjectTool.audio')
  }, {
    ...videoToolConfig,
    type: MenuType.Form,
    label: i18n => i18n.get('plugins.toolbar.insertObjectTool.video')
  }, {
    ...subscriptToolConfig,
    type: MenuType.Action,
    label: i18n => i18n.get('plugins.toolbar.insertObjectTool.subscript')
  }, {
    ...superscriptToolConfig,
    type: MenuType.Action,
    label: i18n => i18n.get('plugins.toolbar.insertObjectTool.superscript')
  }, {
    ...codeToolConfig,
    type: MenuType.Action,
    label: i18n => i18n.get('plugins.toolbar.insertObjectTool.code')
  }, {
    ...blockquoteToolConfig,
    type: MenuType.Action,
    label: i18n => i18n.get('plugins.toolbar.insertObjectTool.blockquote')
  }, {
    ...leftToRightToolConfig,
    type: MenuType.Action,
    label: i18n => i18n.get('plugins.toolbar.insertObjectTool.leftToRight')
  }, {
    ...rightToLeftToolConfig,
    type: MenuType.Action,
    label: i18n => i18n.get('plugins.toolbar.insertObjectTool.rightToLeft')
  }]
}
export const insertObjectTool = new GroupTool(insertObjectToolConfig);
