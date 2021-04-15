import { HistoryMatcher } from '../matcher/history.matcher';
import { HistoryCommander } from '../commands/history.commander';
import { ButtonTool, ButtonToolConfig } from '../toolkit/_api';

export const historyForwardToolConfig: ButtonToolConfig = {
  iconClasses: ['textbus-icon-history-forward'],
  tooltip: i18n => i18n.get('plugins.toolbar.historyForwardTool.tooltip'),
  matcher: new HistoryMatcher('forward'),
  commanderFactory() {
    return new HistoryCommander('forward');
  },
  keymap: {
    ctrlKey: true,
    key: 'y'
  }
};
export const historyForwardTool = new ButtonTool(historyForwardToolConfig);
