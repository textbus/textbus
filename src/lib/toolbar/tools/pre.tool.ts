import { PreCommander } from '../commands/pre.commander';
import { PreComponent } from '../../components/pre.component';
import { CodeMatcher } from '../matcher/code.matcher';
import { SelectToolConfig, Toolkit } from '../toolkit/_api';

export const preToolConfig: SelectToolConfig = {
  iconClasses: ['textbus-icon-terminal'],
  tooltip: '代码',
  mini: true,
  options: [{
    value: 'Javascript',
    classes: ['textbus-toolbar-pre-item']
  }, {
    value: 'HTML',
    classes: ['textbus-toolbar-pre-item']
  }, {
    value: 'CSS',
    classes: ['textbus-toolbar-pre-item']
  }, {
    value: 'Typescript',
    classes: ['textbus-toolbar-pre-item']
  }, {
    value: 'Java',
    classes: ['textbus-toolbar-pre-item']
  }, {
    value: 'C',
    classes: ['textbus-toolbar-pre-item']
  }, {
    label: 'C++',
    value: 'CPP',
    classes: ['textbus-toolbar-pre-item']
  }, {
    label: 'C#',
    value: 'CSharp',
    classes: ['textbus-toolbar-pre-item']
  }, {
    value: 'Swift',
    classes: ['textbus-toolbar-pre-item']
  }, {
    value: 'JSON',
    classes: ['textbus-toolbar-pre-item']
  }, {
    value: 'Less',
    classes: ['textbus-toolbar-pre-item']
  }, {
    value: 'SCSS',
    classes: ['textbus-toolbar-pre-item']
  }, {
    value: 'Stylus',
    classes: ['textbus-toolbar-pre-item']
  }, {
    value: 'bash',
    label: '无',
    default: true,
    classes: ['textbus-toolbar-pre-item']
  }],
  matcher: new CodeMatcher(),
  matchOption(t) {
    if (t instanceof PreComponent) {
      for (const item of preToolConfig.options) {
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
