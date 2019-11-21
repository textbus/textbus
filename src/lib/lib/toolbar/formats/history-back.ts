import { ButtonConfig, HandlerType, Priority } from '../help';
import { HistoryCommander } from '../../commands/history-commander';

export const historyBackHandler: ButtonConfig = {
  type: HandlerType.Button,
  classes: ['tanbo-editor-icon-history-back'],
  priority: Priority.Block,
  tooltip: '撤消',
  editable: null,
  // match: {
  //   canUse(range: Range, frame: EditFrame): boolean {
  //     return frame.canForward;
  //   }
  // },
  execCommand: new HistoryCommander('back')
};
