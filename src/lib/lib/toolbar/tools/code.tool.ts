import { HandlerType, SelectConfig } from '../help';
import { CodeCommander } from '../commands/code.commander';
import { CodeTemplate } from '../../templates/code.template';
import { CodeMatcher } from '../matcher/code.matcher';

export const codeTool: SelectConfig = {
  type: HandlerType.Select,
  classes: ['tbus-icon-code'],
  tooltip: '代码',
  mini: true,
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
  }],
  match: new CodeMatcher(),
  highlight(options, t) {
    if (t instanceof CodeTemplate) {
      for (const item of options) {
        if (item.value === t.lang) {
          return item;
        }
      }
    }
  },
  execCommand: new CodeCommander()
};
