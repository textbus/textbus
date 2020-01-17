import { ButtonConfig, HandlerType, Priority } from '../help';
import { CleanCommander } from '../../commands/clean-commander';

export const cleanHandler: ButtonConfig = {
  type: HandlerType.Button,
  classes: ['tanbo-editor-icon-clear-formatting'],
  tooltip: '清除格式',
  priority: Priority.Inline,
  editable: null,
  execCommand: new CleanCommander()
};
