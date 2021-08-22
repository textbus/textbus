import { LinkFormatter } from '@textbus/formatters';

import { CleanCommander } from '../commands/clean.commander';
import { ButtonTool, ButtonToolConfig } from '../toolkit/_api';

export const cleanToolConfig: ButtonToolConfig = {
  iconClasses: ['textbus-icon-clear-formatting'],
  tooltip: i18n => i18n.get('plugins.toolbar.cleanTool.tooltip'),
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
export const cleanTool = new ButtonTool(cleanToolConfig);
