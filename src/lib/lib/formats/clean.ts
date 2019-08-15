import { ButtonHandlerOption, HandlerType } from '../toolbar/help';
import { BlockFormatter } from '../toolbar/block-formatter';

export const cleanHandler: ButtonHandlerOption = {
  type: HandlerType.Button,
  classes: ['tanbo-editor-icon-clean'],
  tooltip: '清除格式',
  execCommand: new BlockFormatter('')
};
