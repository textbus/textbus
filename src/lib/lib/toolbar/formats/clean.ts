import { ButtonConfig, HandlerType, Priority } from '../help';
import { CleanCommander } from '../../commands/clean-commander';

export const cleanHandler: ButtonConfig = {
  type: HandlerType.Button,
  classes: ['tbus-icon-clear-formatting'],
  tooltip: '清除格式',
  priority: Priority.Inline,
  editable: null,
  keymap: {
    ctrlKey: true,
    shiftKey: true,
    altKey: true,
    key: 'c'
  },
  execCommand: new CleanCommander()
};
