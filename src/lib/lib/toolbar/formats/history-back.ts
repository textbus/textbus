import { ButtonConfig, HandlerType, Priority } from '../help';
import { HistoryCommander } from '../../commands/history-commander';
import { HistoryMatcher } from '../../matcher/history-matcher';

export const historyBackHandler: ButtonConfig = {
  type: HandlerType.Button,
  classes: ['tanbo-editor-icon-history-back'],
  priority: Priority.Block,
  tooltip: '撤消',
  editable: null,
  match: new HistoryMatcher('back'),
  execCommand: new HistoryCommander('back')
};
