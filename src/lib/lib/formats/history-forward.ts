import { ButtonHandlerOption, HandlerType } from '../toolbar/help';
import { HistoryFormatter } from '../edit-frame/fomatter/history-formatter';

export const historyForwardHandler: ButtonHandlerOption = {
  type: HandlerType.Button,
  classes: ['tanbo-editor-icon-history-forward'],
  tooltip: '重做',
  execCommand: new HistoryFormatter('forward')
};
