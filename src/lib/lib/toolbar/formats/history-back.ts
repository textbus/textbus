import { blockHandlerPriority, ButtonConfig, HandlerType } from '../help';
import { HistoryCommander } from '../../commands/history-commander';

export const historyBackHandler: ButtonConfig = {
  type: HandlerType.Button,
  classes: ['tanbo-editor-icon-history-back'],
  priority: blockHandlerPriority,
  tooltip: '撤消',
  // match: {
  //   canUse(range: Range, frame: EditFrame): boolean {
  //     return frame.canForward;
  //   }
  // },
  execCommand: new HistoryCommander('back')
};
