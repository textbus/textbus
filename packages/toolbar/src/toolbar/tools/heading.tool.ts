import { BlockComponent, PreComponent } from '@textbus/components';

import { BlockCommander } from '../commands/block.commander';
import { BlockMatcher } from '../matcher/block.matcher';
import { SelectTool, SelectToolConfig } from '../toolkit/_api';

export const headingToolConfig: SelectToolConfig = {
  tooltip: i18n => i18n.get('plugins.toolbar.headingTool.tooltip'),
  matcher: new BlockMatcher(BlockComponent, 'h1,h2,h3,h4,h5,h6,p'.split(','), [PreComponent]),
  matchOption(t) {
    if (t instanceof BlockComponent) {
      for (const item of headingToolConfig.options) {
        if (item.value === t.tagName) {
          return item;
        }
      }
    }
  },
  commanderFactory() {
    return new BlockCommander();
  },
  options: [{
    label: i18n => i18n.get('plugins.toolbar.headingTool.h1'),
    classes: ['textbus-toolbar-h1'],
    value: 'h1',
    keymap: {
      ctrlKey: true,
      key: '1'
    }
  }, {
    label: i18n => i18n.get('plugins.toolbar.headingTool.h2'),
    classes: ['textbus-toolbar-h2'],
    value: 'h2',
    keymap: {
      ctrlKey: true,
      key: '2'
    }
  }, {
    label: i18n => i18n.get('plugins.toolbar.headingTool.h3'),
    classes: ['textbus-toolbar-h3'],
    value: 'h3',
    keymap: {
      ctrlKey: true,
      key: '3'
    }
  }, {
    label: i18n => i18n.get('plugins.toolbar.headingTool.h4'),
    classes: ['textbus-toolbar-h4'],
    value: 'h4',
    keymap: {
      ctrlKey: true,
      key: '4'
    }
  }, {
    label: i18n => i18n.get('plugins.toolbar.headingTool.h5'),
    classes: ['textbus-toolbar-h5'],
    value: 'h5',
    keymap: {
      ctrlKey: true,
      key: '5'
    }
  }, {
    label: i18n => i18n.get('plugins.toolbar.headingTool.h6'),
    classes: ['textbus-toolbar-h6'],
    value: 'h6',
    keymap: {
      ctrlKey: true,
      key: '6'
    }
  }, {
    label: i18n => i18n.get('plugins.toolbar.headingTool.div'),
    value: 'div',
    keymap: {
      ctrlKey: true,
      key: '7'
    }
  }, {
    label: i18n => i18n.get('plugins.toolbar.headingTool.paragraph'),
    value: 'p',
    default: true,
    keymap: {
      ctrlKey: true,
      key: '0'
    }
  }]
};
export const headingTool = new SelectTool(headingToolConfig);
