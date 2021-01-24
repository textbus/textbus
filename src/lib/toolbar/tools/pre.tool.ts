import { PreCommander } from '../commands/pre.commander';
import { PreComponent } from '../../components/pre.component';
import { CodeMatcher } from '../matcher/code.matcher';
import { SelectToolConfig, Toolkit } from '../toolkit/_api';

export const preToolConfig: SelectToolConfig = {
  iconClasses: ['textbus-icon-terminal'],
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
    value: 'C'
  }, {
    label: 'C++',
    value: 'CPP'
  }, {
    label: 'C#',
    value: 'CSharp'
  }, {
    value: 'Swift'
  }, {
    value: 'JSON'
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
    if (t instanceof PreComponent) {
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
}
export const preTool = Toolkit.makeSelectTool(preToolConfig);
