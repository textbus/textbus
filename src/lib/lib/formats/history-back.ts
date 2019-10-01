import { ButtonHandlerOption, HandlerType } from '../toolbar/help';
import { HistoryFormatter } from '../edit-frame/fomatter/history-formatter';
import { EditFrame } from '../edit-frame/edit-frame';

export const historyBackHandler: ButtonHandlerOption = {
  type: HandlerType.Button,
  classes: ['tanbo-editor-icon-history-back'],
  tooltip: '撤消',
  match: {
    canUse(range: Range, frame: EditFrame): boolean {
      return frame.canBack;
    }
  },
  execCommand: new HistoryFormatter('back')
};
