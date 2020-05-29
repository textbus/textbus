import { ButtonConfig, ToolType } from '../../toolbar/help';
import { HistoryMatcher } from '../matcher/history.matcher';
import { HistoryCommander } from '../commands/history.commander';

export const historyBackTool: ButtonConfig = {
  type: ToolType.Button,
  classes: ['tbus-icon-history-back'],
  tooltip: '撤消',
  match: new HistoryMatcher('back'),
  execCommand: new HistoryCommander('back'),
  keymap: {
    ctrlKey: true,
    key: 'z'
  }
};
