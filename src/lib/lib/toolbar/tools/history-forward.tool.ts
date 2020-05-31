import { HistoryMatcher } from '../matcher/history.matcher';
import { HistoryCommander } from '../commands/history.commander';
import { Toolkit } from '../toolkit/toolkit';

export const historyForwardTool = Toolkit.makeButtonTool({
  classes: ['tbus-icon-history-forward'],
  tooltip: '重做',
  match: new HistoryMatcher('forward'),
  execCommand: new HistoryCommander('forward'),
  keymap: {
    ctrlKey: true,
    shiftKey: true,
    key: 'z'
  }
});
