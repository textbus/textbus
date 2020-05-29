import { ButtonConfig, ToolType } from '../../toolbar/help';
import { HistoryMatcher } from '../matcher/history.matcher';
import { HistoryCommander } from '../commands/history.commander';

export const historyForwardTool: ButtonConfig = {
  type: ToolType.Button,
  classes: ['tbus-icon-history-forward'],
  tooltip: '重做',
  match: new HistoryMatcher('forward'),
  execCommand: new HistoryCommander('forward'),
  keymap: {
    ctrlKey: true,
    shiftKey: true,
    key: 'z'
  }
};
