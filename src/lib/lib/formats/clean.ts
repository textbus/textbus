import { ButtonHandlerOption, HandlerType } from '../toolbar/help';
import { BlockFormatter } from '../frame/fomatter/block-formatter';

export const cleanHandler: ButtonHandlerOption = {
  type: HandlerType.Button,
  classes: ['tanbo-editor-icon-clean'],
  tooltip: '清除格式',
  execCommand: new BlockFormatter('')
};
