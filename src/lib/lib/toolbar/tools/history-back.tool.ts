import { HistoryMatcher } from '../matcher/history.matcher';
import { HistoryCommander } from '../commands/history.commander';
import { Toolkit } from '../toolkit/toolkit';

export const historyBackTool = Toolkit.makeButtonTool({
  classes: ['textbus-icon-history-back'],
  tooltip: '撤消',
  matcher: new HistoryMatcher('back'),
  commanderFactory() {
    return new HistoryCommander('back');
  },
  keymap: {
    ctrlKey: true,
    key: 'z'
  }
});
