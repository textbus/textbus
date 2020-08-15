import { HistoryMatcher } from '../matcher/history.matcher';
import { HistoryCommander } from '../commands/history.commander';
import { Toolkit } from '../toolkit/toolkit';

export const historyForwardToolConfig = {
  iconClasses: ['textbus-icon-history-forward'],
  tooltip: '重做',
  matcher: new HistoryMatcher('forward'),
  commanderFactory() {
    return new HistoryCommander('forward');
  },
  keymap: {
    ctrlKey: true,
    shiftKey: true,
    key: 'z'
  }
};
export const historyForwardTool = Toolkit.makeButtonTool(historyForwardToolConfig);
