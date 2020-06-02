import { HistoryMatcher } from '../matcher/history.matcher';
import { HistoryCommander } from '../commands/history.commander';
import { Toolkit } from '../toolkit/toolkit';

export const historyBackTool = Toolkit.makeButtonTool({
  classes: ['tbus-icon-history-back'],
  tooltip: '撤消',
  match: new HistoryMatcher('back'),
  execCommand() {
    return new HistoryCommander('back');
  },
  keymap: {
    ctrlKey: true,
    key: 'z'
  }
});
