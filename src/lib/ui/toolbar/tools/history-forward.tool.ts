import { HistoryMatcher } from '../matcher/history.matcher';
import { HistoryCommander } from '../commands/history.commander';
import { ButtonToolConfig, Toolkit } from '../toolkit/_api';

export const historyForwardToolConfig: ButtonToolConfig = {
  iconClasses: ['textbus-icon-history-forward'],
  tooltip: '重做',
  matcher: new HistoryMatcher('forward'),
  commanderFactory() {
    return new HistoryCommander('forward');
  },
  keymap: {
    ctrlKey: true,
    key: 'y'
  }
};
export const historyForwardTool = Toolkit.makeButtonTool(historyForwardToolConfig);
