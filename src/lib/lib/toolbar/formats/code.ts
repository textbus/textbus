import { HandlerType, Priority, SelectConfig, SelectOptionConfig } from '../help';
import { CodeCommander } from '../../commands/code-commander';
import { AbstractData } from '../../parser/abstract-data';
import { CodeHook } from '../hooks/code-hook';

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
  hook: new CodeHook(),
  execCommand: new CodeCommander(),
  highlight(options: SelectOptionConfig[], data: AbstractData): SelectOptionConfig {
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
    value: 'JSON'
  }, {
    value: 'Ruby'
  }, {
    value: 'Less'
  }, {
    value: 'SCSS'
  }, {
    value: 'Stylus'
  }, {
    value: 'bash',
    label: '无',
    default: true
  }]
};
