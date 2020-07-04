import { CleanCommander } from '../commands/clean.commander';
import { LinkFormatter } from '../../formatter/link.formatter';
import { Toolkit } from '../toolkit/toolkit';

export const cleanTool = Toolkit.makeButtonTool({
  classes: ['tbus-icon-clear-formatting'],
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
});
