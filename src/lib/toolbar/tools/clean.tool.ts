import { CleanCommander } from '../commands/clean.commander';
import { LinkFormatter } from '../../formatter/link.formatter';
import { ButtonToolConfig, Toolkit } from '../toolkit/_api';

export const cleanToolConfig: ButtonToolConfig = {
  iconClasses: ['textbus-icon-clear-formatting'],
  tooltip: '清除格式',
  keymap: {
    ctrlKey: true,
    shiftKey: true,
    altKey: true,
    key: 'c'
  },
  commanderFactory() {
    return new CleanCommander([LinkFormatter]);
  }
};
export const cleanTool = Toolkit.makeButtonTool(cleanToolConfig);
