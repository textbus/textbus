import { ButtonHandlerOption, HandlerType } from '../toolbar/help';
import { HistoryFormatter } from '../edit-frame/fomatter/history-formatter';

export const historyBackHandler: ButtonHandlerOption = {
  type: HandlerType.Button,
  classes: ['tanbo-editor-icon-history-back'],
  tooltip: '撤消',
  execCommand: new HistoryFormatter('back')
};
