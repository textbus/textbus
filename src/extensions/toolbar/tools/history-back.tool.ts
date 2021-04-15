import { HistoryMatcher } from '../matcher/history.matcher';
import { HistoryCommander } from '../commands/history.commander';
import { ButtonTool, ButtonToolConfig } from '../toolkit/_api';

export const historyBackToolConfig: ButtonToolConfig = {
  iconClasses: ['textbus-icon-history-back'],
  tooltip: i18n => i18n.get('plugins.toolbar.historyBackTool.tooltip'),
  matcher: new HistoryMatcher('back'),
  commanderFactory() {
    return new HistoryCommander('back');
  },
  keymap: {
    ctrlKey: true,
    key: 'z'
  }
};
export const historyBackTool = new ButtonTool(historyBackToolConfig);
