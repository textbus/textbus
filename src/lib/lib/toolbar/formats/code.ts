import { HandlerType, Priority, SelectConfig, SelectOptionConfig } from '../help';
import { CodeCommander } from '../../commands/code-commander';
import { CacheData } from '../utils/cache-data';

export const codeHandler: SelectConfig = {
  type: HandlerType.Select,
  classes: ['tanbo-editor-icon-code'],
  tooltip: '代码',
  priority: Priority.Block,
  mini: true,
  editable: {
    tag: true,
    attrs: ['lang']
  },
  match: {
    tags: ['pre']
  },
  execCommand: new CodeCommander(),
  highlight(options: SelectOptionConfig[], data: CacheData): SelectOptionConfig {
    for (const item of options) {
      if (data.attrs.get('lang') === item.value) {
        return item;
      }
    }
    return null;
  },
  options: [{
    value: 'Javascript'
  }, {
    value: 'HTML'
  }, {
    value: 'CSS'
  }, {
    value: 'Typescript'
  }, {
    value: 'Java'
  }, {
    value: 'Shell'
  }, {
    value: 'Python'
  }, {
    value: 'Swift'
  }, {
    value: 'C'
  }, {
    value: 'C++'
  }, {
    value: 'bash',
    label: '无',
    default: true
  }]
};
