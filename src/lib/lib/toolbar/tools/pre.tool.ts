import { PreCommander } from '../commands/pre.commander';
import { PreTemplate } from '../../templates/pre.template';
import { CodeMatcher } from '../matcher/code.matcher';
import { Toolkit } from '../toolkit/toolkit';

export const preTool = Toolkit.makeSelectTool({
  classes: ['tbus-icon-terminal'],
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
  matcher: new CodeMatcher(),
  highlight(options, t) {
    if (t instanceof PreTemplate) {
      for (const item of options) {
        if (item.value === t.lang) {
          return item;
        }
      }
    }
  },
  commanderFactory() {
    return new PreCommander();
  }
});
