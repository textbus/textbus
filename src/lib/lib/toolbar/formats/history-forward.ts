import { ButtonConfig, HandlerType } from '../help';
import { HistoryCommander } from '../../commands/history-commander';

export const historyForwardHandler: ButtonConfig = {
  type: HandlerType.Button,
  classes: ['tanbo-editor-icon-history-forward'],
  tooltip: '重做',
  // match: {
  //   canUse(range: Range, frame: EditFrame): boolean {
  //     return frame.canForward;
  //   }
  // },
  execCommand: new HistoryCommander('forward')
};
