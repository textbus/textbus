import { ButtonConfig, HandlerType } from '../help';
import { CleanCommander } from '../commands/clean.commander';

export const cleanTool: ButtonConfig = {
  type: HandlerType.Button,
  classes: ['tbus-icon-clear-formatting'],
  tooltip: '清除格式',
  keymap: {
    ctrlKey: true,
    shiftKey: true,
    altKey: true,
    key: 'c'
  },
  execCommand: new CleanCommander()
};
