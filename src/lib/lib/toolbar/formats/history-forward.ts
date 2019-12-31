import { ButtonConfig, HandlerType, Priority } from '../help';
import { HistoryCommander } from '../../commands/history-commander';
import { HistoryMatcher } from '../../matcher/history-matcher';
import { historyHook } from '../hooks/history-hook';

export const historyForwardHandler: ButtonConfig = {
  type: HandlerType.Button,
  classes: ['tanbo-editor-icon-history-forward'],
  tooltip: '重做',
  priority: Priority.Block,
  editable: null,
  hook: historyHook,
  match: new HistoryMatcher('forward'),
  execCommand: new HistoryCommander('forward')
};
