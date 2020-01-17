import { ButtonConfig, HandlerType, Priority } from '../help';
import { HistoryCommander } from '../../commands/history-commander';
import { HistoryMatcher } from '../../matcher/history-matcher';
import { historyHook } from '../hooks/history-hook';

export const historyBackHandler: ButtonConfig = {
  type: HandlerType.Button,
  classes: ['tanbo-editor-icon-history-back'],
  priority: Priority.Block,
  tooltip: '撤消',
  editable: null,
  hook: historyHook,
  match: new HistoryMatcher('back'),
  execCommand: new HistoryCommander('back'),
  keymap: {
    ctrlKey: true,
    key: 'z'
  }
};
