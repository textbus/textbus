import { ButtonHandlerOption, HandlerType } from '../toolbar/help';
import { BlockFormatter } from '../toolbar/fomatter/block-formatter';

export const colorHandler: ButtonHandlerOption = {
  type: HandlerType.Button,
  classes: ['tanbo-editor-icon-color'],
  tooltip: '引用',
  execCommand: new BlockFormatter('')
};
