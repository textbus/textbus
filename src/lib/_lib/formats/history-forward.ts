import { ButtonHandlerOption, HandlerType } from '../toolbar/help';
import { HistoryFormatter } from '../edit-frame/fomatter/history-formatter';
import { EditFrame } from '../edit-frame/edit-frame';

export const historyForwardHandler: ButtonHandlerOption = {
  type: HandlerType.Button,
  classes: ['tanbo-editor-icon-history-forward'],
  tooltip: '重做',
  match: {
    canUse(range: Range, frame: EditFrame): boolean {
      return frame.canForward;
    }
  },
  execCommand: new HistoryFormatter('forward')
};
