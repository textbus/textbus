import { ButtonHandler, HandlerType } from '../toolbar/help';
import { BlockFormatter } from '../toolbar/block-formatter';

export const colorHandler: ButtonHandler = {
  type: HandlerType.Button,
  classes: ['tanbo-editor-icon-color'],
  tooltip: '引用',
  execCommand: new BlockFormatter('')
};
