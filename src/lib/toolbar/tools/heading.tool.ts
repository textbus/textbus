import { BlockCommander } from '../commands/block.commander';
import { BlockComponent } from '../../components/block.component';
import { BlockMatcher } from '../matcher/block.matcher';
import { SelectToolConfig, Toolkit } from '../toolkit/_api';
import { PreComponent } from '../../components/pre.component';

export const headingToolConfig: SelectToolConfig = {
  tooltip: '段落与标题',
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
    label: '标题1',
    classes: ['textbus-toolbar-h1'],
    value: 'h1',
    keymap: {
      ctrlKey: true,
      key: '1'
    }
  }, {
    label: '标题2',
    classes: ['textbus-toolbar-h2'],
    value: 'h2',
    keymap: {
      ctrlKey: true,
      key: '2'
    }
  }, {
    label: '标题3',
    classes: ['textbus-toolbar-h3'],
    value: 'h3',
    keymap: {
      ctrlKey: true,
      key: '3'
    }
  }, {
    label: '标题4',
    classes: ['textbus-toolbar-h4'],
    value: 'h4',
    keymap: {
      ctrlKey: true,
      key: '4'
    }
  }, {
    label: '标题5',
    classes: ['textbus-toolbar-h5'],
    value: 'h5',
    keymap: {
      ctrlKey: true,
      key: '5'
    }
  }, {
    label: '标题6',
    classes: ['textbus-toolbar-h6'],
    value: 'h6',
    keymap: {
      ctrlKey: true,
      key: '6'
    }
  }, {
    label: '正文',
    value: 'p',
    default: true,
    keymap: {
      ctrlKey: true,
      key: '0'
    }
  }]
};
export const headingTool = Toolkit.makeSelectTool(headingToolConfig);
