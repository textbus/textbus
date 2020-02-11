import { HandlerType, Priority, SelectConfig, SelectOptionConfig } from '../help';
import { CodeCommander } from '../../commands/code-commander';
import { AbstractData } from '../../parser/abstract-data';
import { CodeHook } from '../hooks/code-hook';

export const codeHandler: SelectConfig = {
  type: HandlerType.Select,
  classes: ['tbus-icon-code'],
  tooltip: '代码',
  priority: Priority.Block,
  mini: true,
  styleSheets: [`code, pre {
  background-color: rgba(0, 0, 0, .03);
}

pre code {
  padding: 0;
  border: none;
  background: none;
  border-radius: 0;
  vertical-align: inherit;
}

code {
  padding: 1px 5px;
  border-radius: 3px;
  vertical-align: middle;
  border: 1px solid rgba(0, 0, 0, .08);
}

pre {
  line-height: 1.418em;
  padding: 15px;
  border-radius: 5px;
  border: 1px solid #e9eaec;
  word-break: break-all;
  word-wrap: break-word;
  white-space: pre-wrap;

}

code, kbd, pre, samp {
  font-family: Microsoft YaHei Mono, Menlo, Monaco, Consolas, Courier New, monospace;
}`],
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
