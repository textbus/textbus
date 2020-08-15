import { HistoryMatcher } from '../matcher/history.matcher';
import { HistoryCommander } from '../commands/history.commander';
import { Toolkit } from '../toolkit/toolkit';

export const historyBackToolConfig = {
  iconClasses: ['textbus-icon-history-back'],
  tooltip: '撤消',
  matcher: new HistoryMatcher('back'),
  commanderFactory() {
    return new HistoryCommander('back');
  },
  keymap: {
    ctrlKey: true,
    key: 'z'
  }
};
export const historyBackTool = Toolkit.makeButtonTool(historyBackToolConfig);
