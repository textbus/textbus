import { HandlerType, SelectConfig } from '../help';
import { BlockTemplate } from '../../templates/block.template';
import { BlockMatcher } from '../matcher/block.matcher';
import { CodeCommander } from '../commands/code.commander';

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
  match: new BlockMatcher(BlockTemplate),
  highlight(options, p) {
    console.log(p);
    return options[0]
  },
  execCommand: new CodeCommander()
};
